---
title: Week 12 — Time Series Analysis
description: Time series data must stay in chronological order. Learn to check stationarity with the ADF test, pick ARIMA orders from ACF/PACF plots, model seasonality with SARIMA, and evaluate forecasts with RMSE, MAE, and MAPE.
---

> 🎯 **TL;DR:** Time series data must stay in chronological order — never shuffle. Check stationarity with ADF test; difference until stationary. Use ACF to find q (MA order) and PACF to find p (AR order). ARIMA(p,d,q) for non-seasonal data, SARIMA(p,d,q)(P,D,Q,m) for seasonal data. Evaluate with RMSE/MAE/MAPE on a sequential (not random) test split.

## 🧠 Mental Model

Think of a time series like **a river's water level over time**. The river has a trend (rising due to climate change), seasonality (higher in spring floods, lower in summer), and noise (random daily fluctuations from rain). ARIMA is like a mathematician who says: "I can predict tomorrow's level using the past P days' levels (AR) and past P days' prediction errors (MA), after removing the trend by differencing D times." SARIMA adds: "...and I'll also account for the fact that water levels repeat every year (seasonal period m)."

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>What It Is</th><th>Key Detail</th></tr>
<tr><td><strong>Stationarity</strong></td><td>Mean & variance constant over time</td><td>Required by ARIMA/AR/MA models</td></tr>
<tr><td><strong>ADF Test</strong></td><td>Tests for unit root (non-stationarity)</td><td>p &lt; 0.05 → reject H₀ → IS stationary</td></tr>
<tr><td><strong>Differencing (d)</strong></td><td>Subtract consecutive values</td><td>df.diff() removes linear trend</td></tr>
<tr><td><strong>ACF</strong></td><td>Correlation between series and its lags</td><td>Cuts off at lag q → MA order</td></tr>
<tr><td><strong>PACF</strong></td><td>Direct correlation at each lag (removes indirect)</td><td>Cuts off at lag p → AR order</td></tr>
<tr><td><strong>AR(p)</strong></td><td>Regress on p past values</td><td>y(t) = c + φ₁y(t-1) + ... + φₚy(t-p) + ε</td></tr>
<tr><td><strong>MA(q)</strong></td><td>Regress on q past error terms</td><td>y(t) = c + ε(t) + θ₁ε(t-1) + ... + θqε(t-q)</td></tr>
<tr><td><strong>ARIMA(p,d,q)</strong></td><td>AR + Integrated + MA</td><td>d = number of differences applied</td></tr>
<tr><td><strong>SARIMA(p,d,q)(P,D,Q,m)</strong></td><td>ARIMA + seasonal component</td><td>m = seasonal period (12=monthly, 4=quarterly)</td></tr>
<tr><td><strong>HWES</strong></td><td>Holt-Winters Exponential Smoothing</td><td>Level + Trend + Seasonal triple smoothing</td></tr>
<tr><td><strong>VAR</strong></td><td>Vector AutoRegression — multivariate</td><td>Each series regressed on lags of ALL series</td></tr>
</table>

## 🔢 Key Steps / Process

1. **Load data** — parse dates, set DatetimeIndex, sort chronologically (NEVER shuffle)
2. **Visualize** — plot series, check for obvious trend/seasonality
3. **Decompose** — seasonal_decompose to separate trend, seasonal, residual
4. **Check stationarity** — ADF test on original series
5. **Make stationary** — difference (d), log-transform, seasonal difference as needed
6. **Re-test** — run ADF again on transformed series; repeat until p < 0.05
7. **Plot ACF & PACF** — determine q (ACF cutoff) and p (PACF cutoff)
8. **Train/test split** — chronological split (e.g., 80% train, 20% test), NO shuffle
9. **Fit model** — ARIMA(p,d,q) or use auto_arima to search automatically
10. **Forecast & evaluate** — RMSE, MAE, MAPE; plot actual vs forecast

## 💻 Code Cheatsheet

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from statsmodels.tsa.stattools import adfuller, kpss
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from sklearn.metrics import mean_squared_error, mean_absolute_error
import warnings
warnings.filterwarnings('ignore')

# ════════════════════════════════════════════════
# 1. DATA LOADING & BASIC EDA
# ════════════════════════════════════════════════

df = pd.read_csv('data.csv', parse_dates=['Date'], index_col='Date')
df = df.sort_index()           # CRITICAL: always sort by time
df = df.asfreq('MS')           # Set frequency: 'MS'=month start, 'D'=daily, 'H'=hourly
df = df.fillna(method='ffill') # Forward-fill any gaps

ts = df['value']               # The target time series column

# Basic stats
print(f"Length: {len(ts)}, Start: {ts.index[0]}, End: {ts.index[-1]}")
print(ts.describe())

plt.figure(figsize=(14, 4))
plt.plot(ts)
plt.title('Raw Time Series')
plt.xlabel('Date'); plt.ylabel('Value')
plt.show()

# ════════════════════════════════════════════════
# 2. DECOMPOSITION — Trend + Seasonal + Residual
# ════════════════════════════════════════════════

# model='additive' if seasonal variation is constant
# model='multiplicative' if seasonal variation grows with trend
result = seasonal_decompose(ts, model='additive', period=12)
result.plot()
plt.tight_layout()
plt.show()

# Extract components
trend = result.trend.dropna()
seasonal = result.seasonal
residual = result.resid.dropna()

# ════════════════════════════════════════════════
# 3. STATIONARITY TESTING — ADF & KPSS
# ════════════════════════════════════════════════

def check_stationarity(series, name='Series'):
    """Run ADF test. H₀: non-stationary. Reject H₀ if p < 0.05."""
    result = adfuller(series.dropna(), autolag='AIC')
    print(f"\n{'='*40}")
    print(f"ADF Test — {name}")
    print(f"  ADF Statistic : {result[0]:.4f}")
    print(f"  p-value       : {result[1]:.4f}")
    print(f"  Critical (5%) : {result[4]['5%']:.4f}")
    if result[1] < 0.05:
        print("  ✅ STATIONARY (reject H₀, p < 0.05)")
    else:
        print("  ❌ NON-STATIONARY (fail to reject H₀, p >= 0.05)")
    return result[1] < 0.05

# Check and progressively difference until stationary
is_stat = check_stationarity(ts, 'Original')

if not is_stat:
    ts_d1 = ts.diff().dropna()           # First-order differencing (removes linear trend)
    is_stat = check_stationarity(ts_d1, '1st Difference')

    if not is_stat:
        ts_d2 = ts_d1.diff().dropna()    # Second-order differencing (rarely needed)
        check_stationarity(ts_d2, '2nd Difference')
        ts_stationary = ts_d2
    else:
        ts_stationary = ts_d1
else:
    ts_stationary = ts

# Log transform for exponential growth / variance stabilization
ts_log = np.log(ts)
check_stationarity(ts_log, 'Log Transform')

# Seasonal differencing (removes seasonality)
ts_seasonal_diff = ts.diff(12).dropna()  # period=12 for monthly data
check_stationarity(ts_seasonal_diff, 'Seasonal Differenced (period=12)')

# ════════════════════════════════════════════════
# 4. ACF & PACF PLOTS — Determine p and q
# ════════════════════════════════════════════════
# ACF → q (MA order): note where autocorrelation drops inside confidence bounds
# PACF → p (AR order): note where partial autocorrelation drops inside confidence bounds

fig, axes = plt.subplots(1, 2, figsize=(14, 4))
plot_acf(ts_stationary, lags=40, ax=axes[0])
axes[0].set_title('ACF — determines q (MA order)\nLook for cutoff lag')
plot_pacf(ts_stationary, lags=40, ax=axes[1])
axes[1].set_title('PACF — determines p (AR order)\nLook for cutoff lag')
plt.tight_layout()
plt.show()

# ════════════════════════════════════════════════
# 5. TRAIN / TEST SPLIT — NEVER SHUFFLE
# ════════════════════════════════════════════════

split = int(len(ts) * 0.8)           # 80% train, 20% test
train = ts.iloc[:split]
test  = ts.iloc[split:]

print(f"Train: {train.index[0]} → {train.index[-1]} ({len(train)} obs)")
print(f"Test : {test.index[0]} → {test.index[-1]} ({len(test)} obs)")

# ════════════════════════════════════════════════
# 6. ARIMA MODEL
# ════════════════════════════════════════════════

# ARIMA(p, d, q): p=AR order, d=differencing, q=MA order
arima = ARIMA(train, order=(2, 1, 2))    # Adjust p,d,q from ACF/PACF analysis
arima_fit = arima.fit()
print(arima_fit.summary())               # Check AIC, BIC, residual diagnostics

# In-sample diagnostic plots
arima_fit.plot_diagnostics(figsize=(12, 8))
plt.show()

# Forecast
forecast_arima = arima_fit.forecast(steps=len(test))
forecast_arima.index = test.index       # Align index for plotting

# ════════════════════════════════════════════════
# 7. AUTO ARIMA — Automatic p, d, q Search
# ════════════════════════════════════════════════
# pip install pmdarima

import pmdarima as pm

auto_model = pm.auto_arima(
    train,
    seasonal=False,            # Set True for SARIMA
    stepwise=True,             # Faster than exhaustive search
    information_criterion='aic',
    suppress_warnings=True,
    trace=True                 # Print candidates being tested
)
print(f"\nBest ARIMA order: {auto_model.order}")
print(auto_model.summary())

auto_forecast = auto_model.predict(n_periods=len(test))

# ════════════════════════════════════════════════
# 8. SARIMA — Seasonal ARIMA
# ════════════════════════════════════════════════

# SARIMA(p,d,q)(P,D,Q,m): m=seasonal period
# m=12 for monthly, m=4 for quarterly, m=7 for weekly
sarima = SARIMAX(
    train,
    order=(1, 1, 1),               # Non-seasonal: (p, d, q)
    seasonal_order=(1, 1, 1, 12),  # Seasonal: (P, D, Q, m)
    enforce_stationarity=False,
    enforce_invertibility=False
)
sarima_fit = sarima.fit(disp=False)
print(sarima_fit.summary())

forecast_sarima = sarima_fit.forecast(steps=len(test))

# Auto SARIMA
auto_sarima = pm.auto_arima(
    train,
    seasonal=True, m=12,
    stepwise=True, trace=True,
    suppress_warnings=True
)
print(f"Best SARIMA: {auto_sarima.order}, seasonal: {auto_sarima.seasonal_order}")

# ════════════════════════════════════════════════
# 9. HOLT-WINTERS EXPONENTIAL SMOOTHING (HWES)
# ════════════════════════════════════════════════

hwes = ExponentialSmoothing(
    train,
    trend='add',             # 'add'=additive trend, 'mul'=multiplicative, None=no trend
    seasonal='add',          # 'add'=additive seasonal, 'mul'=multiplicative, None=no seasonal
    seasonal_periods=12      # Seasonal cycle length
)
hwes_fit = hwes.fit(optimized=True)    # Automatically optimize smoothing params

forecast_hwes = hwes_fit.forecast(len(test))
print(f"Alpha (level): {hwes_fit.params['smoothing_level']:.4f}")
print(f"Beta  (trend): {hwes_fit.params['smoothing_trend']:.4f}")

# ════════════════════════════════════════════════
# 10. VAR — Vector AutoRegression (Multivariate)
# ════════════════════════════════════════════════

from statsmodels.tsa.vector_ar.var_model import VAR

# Multi-column dataframe — forecast ALL series simultaneously
df_multi = df[['series1', 'series2', 'series3']]
train_m = df_multi.iloc[:split]
test_m  = df_multi.iloc[split:]

var_model = VAR(train_m)
# Select optimal lag order by AIC
lag_order = var_model.select_order(maxlags=12)
print(lag_order.summary())
p_opt = lag_order.aic

var_fit = var_model.fit(p_opt)
print(var_fit.summary())

# Forecast
var_forecast = var_fit.forecast(train_m.values[-p_opt:], steps=len(test_m))
var_forecast_df = pd.DataFrame(var_forecast, columns=df_multi.columns, index=test_m.index)

# ════════════════════════════════════════════════
# 11. EVALUATION METRICS
# ════════════════════════════════════════════════

def evaluate_forecast(actual, predicted, model_name='Model'):
    actual = np.array(actual)
    predicted = np.array(predicted)
    rmse = np.sqrt(mean_squared_error(actual, predicted))
    mae  = mean_absolute_error(actual, predicted)
    # MAPE: mean absolute percentage error (avoid div by zero)
    mask = actual != 0
    mape = np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100
    print(f"{model_name:25s} | RMSE={rmse:8.2f} | MAE={mae:8.2f} | MAPE={mape:6.2f}%")
    return {'rmse': rmse, 'mae': mae, 'mape': mape}

# Compare all models
evaluate_forecast(test, forecast_arima, 'ARIMA(2,1,2)')
evaluate_forecast(test, auto_forecast,  'Auto ARIMA')
evaluate_forecast(test, forecast_sarima,'SARIMA(1,1,1)(1,1,1,12)')
evaluate_forecast(test, forecast_hwes,  'Holt-Winters')

# ════════════════════════════════════════════════
# 12. VISUALIZATION — Actual vs Forecast
# ════════════════════════════════════════════════

plt.figure(figsize=(14, 6))
plt.plot(train.index, train, label='Train', color='steelblue')
plt.plot(test.index, test, label='Actual', color='black', linewidth=2)
plt.plot(test.index, forecast_sarima, label='SARIMA Forecast',
         color='red', linestyle='--')
plt.plot(test.index, forecast_hwes, label='HWES Forecast',
         color='green', linestyle='-.')
plt.legend(); plt.title('Time Series Forecast Comparison')
plt.tight_layout(); plt.show()

# ════════════════════════════════════════════════
# 13. TIME SERIES AS SUPERVISED ML (Lag Features)
# ════════════════════════════════════════════════

def create_lag_features(series, n_lags=5):
    """Convert univariate series to supervised ML format using lag features."""
    df_feat = pd.DataFrame({'y': series.values})
    for lag in range(1, n_lags + 1):
        df_feat[f'lag_{lag}'] = df_feat['y'].shift(lag)
    df_feat.dropna(inplace=True)
    X = df_feat.drop('y', axis=1)
    y = df_feat['y']
    return X, y

X, y = create_lag_features(ts, n_lags=12)
split = int(len(X) * 0.8)
X_train, X_test = X.iloc[:split], X.iloc[split:]
y_train, y_test = y.iloc[:split], y.iloc[split:]

from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc  = scaler.transform(X_test)

gb = GradientBoostingRegressor(n_estimators=300, learning_rate=0.05, random_state=42)
gb.fit(X_train_sc, y_train)
preds = gb.predict(X_test_sc)
evaluate_forecast(y_test, preds, 'Gradient Boosting')
```

## ⚙️ Key Parameters / Hyperparameters

<table>
<tr><th>Parameter</th><th>Model</th><th>How to Determine</th><th>Effect</th></tr>
<tr><td><strong>p</strong> (AR order)</td><td>ARIMA/SARIMA</td><td>PACF plot cutoff lag</td><td>How many past values to regress on</td></tr>
<tr><td><strong>d</strong> (differencing)</td><td>ARIMA/SARIMA</td><td>ADF test — how many diffs until stationary</td><td>Removes trend to achieve stationarity</td></tr>
<tr><td><strong>q</strong> (MA order)</td><td>ARIMA/SARIMA</td><td>ACF plot cutoff lag</td><td>How many past errors to include</td></tr>
<tr><td><strong>m</strong> (seasonal period)</td><td>SARIMA/HWES</td><td>Domain knowledge or periodogram</td><td>12=monthly, 4=quarterly, 7=weekly</td></tr>
<tr><td><strong>trend</strong> smoothing α</td><td>HWES</td><td>Auto-optimized by fit()</td><td>Weight on most recent level observation</td></tr>
<tr><td><strong>n_lags</strong></td><td>Lag features / VAR</td><td>ACF/PACF, domain knowledge</td><td>How far back to look for patterns</td></tr>
</table>

## 🎤 Top Interview Q&A

**Q1: Why must time series train/test split be chronological — not random?**

A: Random splitting would leak future information into training data (data leakage). The model would see patterns from "the future" during training and produce unrealistically optimistic evaluation scores. In deployment, we only have past data, so evaluation must mirror that.

**Q2: What does the ADF test actually test?**

A: H₀ = series has a unit root (is non-stationary). If p-value < 0.05, we reject H₀ and conclude the series IS stationary. The ADF statistic must be more negative than the critical value to reject H₀.

**Q3: How do you choose p, d, q for ARIMA?**

A: d = number of differences needed to achieve stationarity (ADF test). After differencing, plot ACF → q is where it cuts off inside confidence bounds. Plot PACF → p is where it cuts off. Or use auto_arima to search by AIC/BIC.

**Q4: What's the difference between ARIMA and SARIMA?**

A: ARIMA(p,d,q) handles non-seasonal data. SARIMA(p,d,q)(P,D,Q,m) adds seasonal autoregressive (P), differencing (D), and moving average (Q) terms with period m. Use SARIMA when ACF shows spikes at regular seasonal lags (e.g., lag 12, 24 for monthly data).

**Q5: When would you use HWES over ARIMA?**

A: HWES (Holt-Winters) is simpler, intuitive, and works well with clear trend and seasonality patterns. ARIMA/SARIMA gives more flexibility and diagnostic tools. HWES is faster to fit; ARIMA can capture complex autocorrelation structures.

**Q6: What does it mean if residuals are white noise?**

A: The model has captured all systematic patterns in the data — remaining errors are random (mean ≈ 0, no autocorrelation). Check with Ljung-Box test or residual ACF plot. Non-white-noise residuals indicate a better model is needed.

**Q7: What is MAPE and what's a good value?**

A: MAPE = mean absolute percentage error = mean(|actual-predicted|/|actual|) × 100%. Below 10% is excellent, 10-20% is good, 20-50% is OK, >50% is poor. MAPE is undefined when actual=0, so use RMSE or MAE in those cases.

**Q8: ARIMA vs Gradient Boosting with lag features — which is better?**

A: ARIMA is interpretable, handles small datasets, gives confidence intervals, and respects temporal structure theoretically. Gradient Boosting with lag features can capture non-linear patterns and add external features easily but needs more data and careful feature engineering. Try both and evaluate on the test set.

## ⚠️ Common Mistakes

- **Shuffling time series data** — NEVER shuffle. Always use chronological train/test splits. Shuffling causes catastrophic data leakage.
- **Applying ARIMA to non-stationary data** — Always check ADF test first; difference until stationary. d in ARIMA tells you how many times to difference.
- **Fitting scaler/vectorizer on test data** — Fit StandardScaler on training data only, then `transform` test data. Fitting on test leaks future distribution.
- **Ignoring seasonal component** — Check ACF for spikes at lag m, m×2, etc. If seasonal spikes exist, use SARIMA or HWES instead of plain ARIMA.
- **Using MAPE with zero values** — Division by zero breaks MAPE. Use RMSE or MAE when the series has zero or near-zero values.
- **Evaluating with in-sample fit instead of out-of-sample forecast** — Always evaluate on the held-out test set, not on training data. In-sample fit is almost always misleadingly good.
- **Not checking residual diagnostics** — Plot ACF of residuals and run Ljung-Box test. If residuals show autocorrelation, the model is missing structure.

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Situation</th><th>Recommended Model</th></tr>
<tr><td>Stationary, no seasonality, autocorrelated</td><td>ARMA(p, q)</td></tr>
<tr><td>Non-stationary, no seasonality</td><td>ARIMA(p, d, q)</td></tr>
<tr><td>Non-stationary, seasonal patterns</td><td>SARIMA(p,d,q)(P,D,Q,m)</td></tr>
<tr><td>Seasonal + exogenous features (promotions, weather)</td><td>SARIMAX</td></tr>
<tr><td>Multiple correlated time series</td><td>VAR (Vector AutoRegression)</td></tr>
<tr><td>Level + trend only, no seasonality</td><td>Holt's Exponential Smoothing</td></tr>
<tr><td>Level + trend + seasonality, interpretable</td><td>HWES (Holt-Winters)</td></tr>
<tr><td>Non-linear patterns, lots of data, feature-rich</td><td>Gradient Boosting with lag features</td></tr>
<tr><td>Don't know p, d, q — let algorithm decide</td><td>pmdarima auto_arima</td></tr>
</table>

## 📋 Completion Checklist

- Explain the 3 time series components (trend, seasonality, residual) with an example
- Run ADF test, interpret p-value, and make series stationary via differencing
- Plot and interpret ACF and PACF to determine p and q
- Perform chronological train/test split and explain why shuffling is wrong
- Fit ARIMA(p,d,q) with statsmodels, check summary, forecast, and evaluate
- Use pmdarima auto_arima to automatically select the best ARIMA order
- Fit SARIMA with seasonal_order=(P,D,Q,m) for seasonal data
- Fit HWES (ExponentialSmoothing) with trend and seasonal parameters
- Calculate and compare RMSE, MAE, MAPE across multiple models
- Convert time series to supervised ML format using lag features and train any sklearn model
