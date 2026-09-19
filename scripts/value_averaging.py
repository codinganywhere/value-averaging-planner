#!/usr/bin/env python3
"""Deterministic value-averaging calculations with inflation support."""

from __future__ import annotations

import argparse
import json
import math
from decimal import Decimal, InvalidOperation, ROUND_FLOOR, ROUND_HALF_UP
from dataclasses import asdict, dataclass
from typing import Literal


GoalBasis = Literal["nominal", "today_money"]
PathType = Literal["linear", "growth_adjusted"]
SellPolicy = Literal["buy_only", "full", "band"]
__version__ = "0.2.0"


def number(value, name):
    try:
        result = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ValueError(f"{name} must be a finite number") from None
    if not result.is_finite():
        raise ValueError(f"{name} must be a finite number")
    return result


def integer(value, name, minimum=1):
    d = number(value, name)
    if isinstance(value, bool) or d != d.to_integral_value() or d < minimum:
        raise ValueError(f"{name} must be an integer >= {minimum}")
    return int(d)


def money(value):
    return float(number(value, "money").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))



def periodic_rate(annual_rate: float, periods_per_year: int = 12) -> float:
    annual_rate = float(number(annual_rate, "annual_rate"))
    periods_per_year = integer(periods_per_year, "periods_per_year")
    if annual_rate <= -1:
        raise ValueError("annual_rate must be greater than -1")
    if periods_per_year <= 0:
        raise ValueError("periods_per_year must be positive")
    return (1.0 + annual_rate) ** (1.0 / periods_per_year) - 1.0


def terminal_nominal_goal(
    goal_amount: float,
    annual_inflation_rate: float,
    periods: int,
    goal_basis: GoalBasis,
    periods_per_year: int = 12,
) -> float:
    goal_amount = float(number(goal_amount, "goal_amount"))
    periods = integer(periods, "periods")
    inflation = periodic_rate(annual_inflation_rate, periods_per_year)
    if goal_amount <= 0:
        raise ValueError("goal_amount must be positive")
    if periods <= 0:
        raise ValueError("periods must be positive")
    if goal_basis == "nominal":
        return goal_amount
    if goal_basis != "today_money":
        raise ValueError("goal_basis must be nominal or today_money")
    inflation = periodic_rate(annual_inflation_rate, periods_per_year)
    return money(goal_amount * (1.0 + inflation) ** periods)


def target_value(
    current_value: float,
    terminal_goal: float,
    period: int,
    periods: int,
    path_type: PathType,
    annual_growth_rate: float = 0.0,
    periods_per_year: int = 12,
) -> float:
    current_value = float(number(current_value, "initial_value"))
    terminal_goal = float(number(terminal_goal, "terminal_goal"))
    periods = integer(periods, "periods")
    period = integer(period, "period", 0)
    growth = periodic_rate(annual_growth_rate, periods_per_year)
    if current_value < 0:
        raise ValueError("current_value cannot be negative")
    if terminal_goal <= 0:
        raise ValueError("terminal_goal must be positive")
    if periods <= 0 or not 0 <= period <= periods:
        raise ValueError("period must be between 0 and periods")
    if path_type == "linear":
        return money(current_value + (terminal_goal - current_value) * period / periods)
    if path_type != "growth_adjusted":
        raise ValueError("path_type must be linear or growth_adjusted")
    growth = periodic_rate(annual_growth_rate, periods_per_year)
    factor = (1.0 + growth) ** periods
    base_increment = (terminal_goal / factor - current_value) / periods
    return money((current_value + base_increment * period) * (1.0 + growth) ** period)


@dataclass(frozen=True)
class Recommendation:
    target_value: float
    market_value: float
    raw_gap: float
    policy_amount: float
    capped_amount: float
    recommended_units: int
    trade_notional: float
    post_trade_value: float
    residual_deviation: float
    contribution_cap_bound: bool
    sell_cap_bound: bool
    within_tolerance_band: bool
    inventory_bound: bool


def recommend_adjustment(
    target: float,
    market_value: float,
    price: float,
    sell_policy: SellPolicy = "buy_only",
    contribution_cap: float | None = None,
    sell_cap: float | None = None,
    tolerance_band: float = 0.0,
    lot_size: int = 1,
    available_units: int | None = None,
) -> Recommendation:
    target = number(target, "target")
    market_value = number(market_value, "market_value")
    price = number(price, "price")
    tolerance_band = number(tolerance_band, "tolerance_band")
    lot_size = integer(lot_size, "lot_size")
    if contribution_cap is not None:
        contribution_cap = number(contribution_cap, "contribution_cap")
    if sell_cap is not None:
        sell_cap = number(sell_cap, "sell_cap")
    if available_units is not None:
        available_units = integer(available_units, "available_units", 0)
    if target < 0 or market_value < 0:
        raise ValueError("target and market_value cannot be negative")
    if price <= 0:
        raise ValueError("price must be positive")
    if lot_size <= 0:
        raise ValueError("lot_size must be positive")
    if contribution_cap is not None and contribution_cap < 0:
        raise ValueError("contribution_cap cannot be negative")
    if sell_cap is not None and sell_cap < 0:
        raise ValueError("sell_cap cannot be negative")
    if not 0 <= tolerance_band <= 1:
        raise ValueError("tolerance_band must be between 0 and 1")
    if sell_policy not in {"buy_only", "full", "band"}:
        raise ValueError("unsupported sell_policy")

    raw_gap = target - market_value
    within_band = sell_policy == "band" and target > 0 and abs(raw_gap) / target <= tolerance_band
    if within_band:
        policy_amount = Decimal(0)
    elif sell_policy == "buy_only":
        policy_amount = max(raw_gap, Decimal(0))
    else:
        policy_amount = raw_gap

    capped_amount = policy_amount
    contribution_bound = False
    sell_bound = False
    if capped_amount > 0 and contribution_cap is not None and capped_amount > contribution_cap:
        capped_amount = contribution_cap
        contribution_bound = True
    if capped_amount < 0 and sell_cap is not None and abs(capped_amount) > sell_cap:
        capped_amount = -sell_cap
        sell_bound = True

    lots = int((abs(capped_amount) / (price * lot_size)).to_integral_value(rounding=ROUND_FLOOR))
    units = lots * lot_size
    if capped_amount < 0:
        units = -units
    inventory_bound = units < 0 and available_units is not None and -units > available_units // lot_size * lot_size
    if units < 0 and available_units is not None:
        units = -min(-units, available_units // lot_size * lot_size)
    notional = units * price
    post_trade = market_value + notional

    return Recommendation(
        target_value=float(target),
        market_value=float(market_value),
        raw_gap=float(raw_gap),
        policy_amount=float(policy_amount),
        capped_amount=float(capped_amount),
        recommended_units=units,
        trade_notional=float(notional),
        post_trade_value=float(post_trade),
        residual_deviation=float(target - post_trade),
        contribution_cap_bound=contribution_bound,
        sell_cap_bound=sell_bound,
        within_tolerance_band=within_band,
        inventory_bound=inventory_bound,
    )


def build_plan(args: argparse.Namespace) -> dict:
    terminal_goal = terminal_nominal_goal(
        args.goal,
        args.annual_inflation,
        args.periods,
        args.goal_basis,
        args.periods_per_year,
    )
    rows = [
        {
            "period": period,
            "target_value": target_value(
                args.current_value,
                terminal_goal,
                period,
                args.periods,
                args.path_type,
                args.annual_growth,
                args.periods_per_year,
            ),
        }
        for period in range(args.periods + 1)
    ]
    return {
        "version": __version__,
        "goal_basis": args.goal_basis,
        "entered_goal": args.goal,
        "terminal_nominal_goal": terminal_goal,
        "annual_inflation": args.annual_inflation,
        "annual_growth": args.annual_growth,
        "path_type": args.path_type,
        "periods": args.periods,
        "periods_per_year": args.periods_per_year,
        "rows": rows,
    }


def calculate_period(args: argparse.Namespace) -> dict:
    terminal_goal = terminal_nominal_goal(
        args.goal,
        args.annual_inflation,
        args.periods,
        args.goal_basis,
        args.periods_per_year,
    )
    target = target_value(
        args.current_value,
        terminal_goal,
        args.period,
        args.periods,
        args.path_type,
        args.annual_growth,
        args.periods_per_year,
    )
    result = recommend_adjustment(
        target,
        args.market_value,
        args.price,
        args.sell_policy,
        args.contribution_cap,
        args.sell_cap,
        args.tolerance_band,
        args.lot_size,
        args.available_units,
    )
    return {
        "version": __version__,
        "period": args.period,
        "terminal_nominal_goal": terminal_goal,
        "recommendation": asdict(result),
    }


def add_plan_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--goal", type=float, required=True)
    parser.add_argument("--initial-value", "--current-value", dest="current_value", type=float, required=True, help="Fixed plan-start market value V0; never replace with this period market value")
    parser.add_argument("--periods", type=int, required=True)
    parser.add_argument("--periods-per-year", type=int, default=12)
    parser.add_argument("--annual-inflation", type=float, default=0.0)
    parser.add_argument("--goal-basis", choices=["nominal", "today_money"], required=True)
    parser.add_argument("--path-type", choices=["linear", "growth_adjusted"], required=True)
    parser.add_argument("--annual-growth", type=float, default=0.0)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    subparsers = parser.add_subparsers(dest="command", required=True)

    plan = subparsers.add_parser("plan", help="Generate a complete target-value path")
    add_plan_arguments(plan)

    period = subparsers.add_parser("period", help="Calculate one period's recommendation")
    add_plan_arguments(period)
    period.add_argument("--period", type=int, required=True)
    period.add_argument("--market-value", type=str, required=True)
    period.add_argument("--price", type=str, required=True)
    period.add_argument("--available-units", type=int)
    period.add_argument("--sell-policy", choices=["buy_only", "full", "band"], default="buy_only")
    period.add_argument("--contribution-cap", type=str)
    period.add_argument("--sell-cap", type=str)
    period.add_argument("--tolerance-band", type=float, default=0.0)
    period.add_argument("--lot-size", type=int, default=1)
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    try:
        payload = build_plan(args) if args.command == "plan" else calculate_period(args)
        print(json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False))
    except (ValueError, OverflowError, InvalidOperation) as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
