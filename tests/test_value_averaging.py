import importlib.util
from pathlib import Path
import sys
import unittest


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "value_averaging.py"
SPEC = importlib.util.spec_from_file_location("value_averaging", MODULE_PATH)
va = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = va
SPEC.loader.exec_module(va)


class ValueAveragingTests(unittest.TestCase):
    def test_embedded_version(self):
        self.assertEqual(va.__version__, "0.2.0")

    def test_periodic_rate_compounds_to_annual_rate(self):
        monthly = va.periodic_rate(0.12, 12)
        self.assertAlmostEqual((1 + monthly) ** 12, 1.12, places=12)

    def test_today_money_goal_is_inflated(self):
        result = va.terminal_nominal_goal(1_000_000, 0.02, 12, "today_money", 12)
        self.assertAlmostEqual(result, 1_020_000, places=6)

    def test_nominal_goal_is_not_inflated_again(self):
        result = va.terminal_nominal_goal(1_000_000, 0.20, 120, "nominal", 12)
        self.assertEqual(result, 1_000_000)

    def test_linear_path_has_correct_endpoints(self):
        self.assertEqual(va.target_value(100, 300, 0, 10, "linear"), 100)
        self.assertEqual(va.target_value(100, 300, 10, 10, "linear"), 300)

    def test_growth_adjusted_path_has_correct_endpoints(self):
        start = va.target_value(100, 300, 0, 10, "growth_adjusted", 0.06)
        end = va.target_value(100, 300, 10, 10, "growth_adjusted", 0.06)
        self.assertAlmostEqual(start, 100, places=9)
        self.assertAlmostEqual(end, 300, places=9)

    def test_buy_only_does_not_sell(self):
        result = va.recommend_adjustment(100_000, 120_000, 50, "buy_only")
        self.assertEqual(result.recommended_units, 0)
        self.assertEqual(result.trade_notional, 0)

    def test_contribution_cap_and_lot_rounding(self):
        result = va.recommend_adjustment(
            200_000,
            100_000,
            63,
            "buy_only",
            contribution_cap=30_000,
            lot_size=100,
        )
        self.assertTrue(result.contribution_cap_bound)
        self.assertEqual(result.recommended_units, 400)
        self.assertEqual(result.trade_notional, 25_200)
        self.assertEqual(result.residual_deviation, 74_800)

    def test_full_policy_applies_sell_cap(self):
        result = va.recommend_adjustment(
            100_000,
            160_000,
            100,
            "full",
            sell_cap=25_000,
            lot_size=1,
        )
        self.assertTrue(result.sell_cap_bound)
        self.assertEqual(result.recommended_units, -250)
        self.assertEqual(result.trade_notional, -25_000)

    def test_band_policy_suppresses_small_deviation(self):
        result = va.recommend_adjustment(
            100_000,
            97_000,
            100,
            "band",
            tolerance_band=0.05,
        )
        self.assertTrue(result.within_tolerance_band)
        self.assertEqual(result.recommended_units, 0)

    def test_invalid_price_is_rejected(self):
        with self.assertRaises(ValueError):
            va.recommend_adjustment(100_000, 90_000, 0)


class RegressionTests(unittest.TestCase):
    def test_decimal_boundary(self):
        r=va.recommend_adjustment("100.1", "100", "0.1")
        self.assertEqual(r.recommended_units,1)
        self.assertEqual(r.residual_deviation,0)

    def test_caps_zero_and_just_below_one_lot(self):
        self.assertEqual(va.recommend_adjustment(200,0,"0.1",contribution_cap="0.099999").recommended_units,0)
        self.assertEqual(va.recommend_adjustment(200,0,10,contribution_cap=0).recommended_units,0)
        self.assertEqual(va.recommend_adjustment(0,200,10,"full",sell_cap=0).recommended_units,0)

    def test_inventory_and_lots(self):
        r=va.recommend_adjustment(1000,2000,10,"full",available_units=30)
        self.assertEqual(r.recommended_units,-30)
        self.assertTrue(r.inventory_bound)
        self.assertEqual(va.recommend_adjustment(1000,2000,10,"full",lot_size=100,available_units=30).recommended_units,0)

    def test_missing_and_nonfinite_prices(self):
        for price in [None,"",0,-1,float("nan"),float("inf")]:
            with self.subTest(price=price), self.assertRaises(ValueError):
                va.recommend_adjustment(100,0,price)

    def test_invalid_inputs(self):
        for kwargs in [dict(lot_size=1.5),dict(available_units=-1),dict(tolerance_band=1.1),dict(contribution_cap=float("nan"))]:
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                va.recommend_adjustment(100,0,10,**kwargs)
        for n in [0,-1,1.5,float("inf")]:
            with self.subTest(n=n), self.assertRaises(ValueError):
                va.terminal_nominal_goal(100,0.02,n,"nominal")
        with self.assertRaises(ValueError): va.target_value(100,200,1,12,"linear",float("nan"))
        with self.assertRaises(ValueError): va.terminal_nominal_goal(100,float("nan"),12,"nominal")

    def test_initial_value_is_fixed(self):
        target=va.target_value(500000,1000000,6,12,"linear")
        self.assertEqual(target,750000)
        self.assertEqual(va.recommend_adjustment(target,700000,100).recommended_units,500)
        self.assertEqual(va.recommend_adjustment(target,730000,100).recommended_units,200)


if __name__ == "__main__":
    unittest.main()
