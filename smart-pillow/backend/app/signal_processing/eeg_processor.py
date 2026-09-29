"""
Signal processing module for EEG and sensor data.
Uses SciPy for digital filtering and spectral analysis.

Disclaimer: These algorithms are for experimental/research purposes only.
Results are NOT clinically validated and should NOT be used for medical diagnosis.
"""
from __future__ import annotations
import numpy as np
from scipy import signal as sp_signal
from typing import List, Tuple, Optional, Dict

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
EEG_FS = 250.0          # Sampling frequency Hz
BANDPASS_LOW = 0.5      # Hz
BANDPASS_HIGH = 40.0    # Hz
NOTCH_FREQ = 50.0       # Hz (power-line interference)
NOTCH_Q = 30.0          # Quality factor
FFT_WINDOW = 4          # seconds → 1000 samples at 250 Hz

# EEG band definitions (Hz)
BANDS = {
    "delta": (0.5, 4.0),
    "theta": (4.0, 8.0),
    "alpha": (8.0, 13.0),
    "beta": (13.0, 30.0),
}


# ---------------------------------------------------------------------------
# Filter design (cached at module load)
# ---------------------------------------------------------------------------
def _design_bandpass(fs: float, low: float, high: float, order: int = 4):
    nyq = fs / 2.0
    return sp_signal.butter(order, [low / nyq, high / nyq], btype="band")


def _design_notch(fs: float, freq: float, q: float):
    return sp_signal.iirnotch(freq / (fs / 2.0), q)


_BP_B, _BP_A = _design_bandpass(EEG_FS, BANDPASS_LOW, BANDPASS_HIGH)
_NOTCH_B, _NOTCH_A = _design_notch(EEG_FS, NOTCH_FREQ, NOTCH_Q)


# ---------------------------------------------------------------------------
# EEG Pre-processing
# ---------------------------------------------------------------------------
def preprocess_eeg(raw: np.ndarray, fs: float = EEG_FS) -> np.ndarray:
    """
    1. Remove DC offset / linear trend
    2. Apply 0.5–40 Hz bandpass (4th-order Butterworth)
    3. Apply 50 Hz notch filter

    NOTE: This does NOT make the signal clinically valid.
    """
    if len(raw) < 10:
        return raw.copy()
    # Step 1: detrend
    detrended = sp_signal.detrend(raw)
    # Step 2: bandpass
    filtered = sp_signal.filtfilt(_BP_B, _BP_A, detrended)
    # Step 3: notch
    notched = sp_signal.filtfilt(_NOTCH_B, _NOTCH_A, filtered)
    return notched


# ---------------------------------------------------------------------------
# PSD / Band Power (Welch method)
# ---------------------------------------------------------------------------
def compute_psd(samples: np.ndarray, fs: float = EEG_FS) -> Tuple[np.ndarray, np.ndarray]:
    """
    Returns (frequencies, power_spectral_density) using Welch's method.
    nperseg chosen to give ~1 Hz resolution or 256 samples, whichever smaller.
    """
    nperseg = min(256, len(samples))
    if nperseg < 4:
        freqs = np.array([0.0])
        psd = np.array([0.0])
        return freqs, psd
    freqs, psd = sp_signal.welch(samples, fs=fs, nperseg=nperseg)
    return freqs, psd


def band_power(freqs: np.ndarray, psd: np.ndarray, low: float, high: float) -> float:
    """
    Integrate PSD over [low, high] Hz using the trapezoidal rule.
    Returns power in units of (input unit)²/Hz * Hz = (input unit)².
    """
    mask = (freqs >= low) & (freqs <= high)
    if not np.any(mask):
        return 0.0
    try:
        from scipy.integrate import trapezoid
        return float(trapezoid(psd[mask], freqs[mask]))
    except ImportError:
        # Fallback to np.trapezoid or np.trapz
        trap = getattr(np, 'trapezoid', getattr(np, 'trapz', None))
        return float(trap(psd[mask], freqs[mask]))


def compute_band_powers(samples: np.ndarray, fs: float = EEG_FS) -> Dict[str, float]:
    """Compute all EEG band powers plus total."""
    freqs, psd = compute_psd(samples, fs)
    powers: Dict[str, float] = {}
    for name, (lo, hi) in BANDS.items():
        powers[name] = band_power(freqs, psd, lo, hi)
    powers["total"] = sum(powers.values())
    return powers


# ---------------------------------------------------------------------------
# Signal Quality Heuristics
# ---------------------------------------------------------------------------
def compute_signal_quality(raw: np.ndarray, fs: float = EEG_FS) -> Dict[str, float | bool]:
    """
    Heuristic signal quality estimates. NOT clinically validated.
    Returns dict with: overall (0-100), clipping, flat_line,
    excessive_amplitude, electrode_contact, noise_50hz.
    """
    if len(raw) < 10:
        return {
            "overall": 0.0, "electrode_contact": 0.0, "noise_50hz": 0.0,
            "clipping": False, "flat_line": True, "excessive_amplitude": False
        }

    adc_max = 4095.0
    norm = raw / adc_max if np.max(np.abs(raw)) > 1.5 else raw  # normalise if ADC range

    # Clipping: >1% of samples near rail
    clipping = bool(np.mean(np.abs(norm) > 0.98) > 0.01)

    # Flat line: very low variance
    flat_line = bool(np.std(norm) < 0.001)

    # Excessive amplitude: rms > 500 μV (assuming ±500 μV full scale)
    rms = float(np.sqrt(np.mean(norm ** 2)))
    excessive = rms > 0.8

    # Electrode contact score: based on variance (higher = better contact)
    contact_score = float(np.clip(np.std(norm) / 0.1 * 100, 0, 100))

    # 50 Hz noise: compute PSD at 50 Hz
    freqs, psd = compute_psd(raw, fs)
    mask_50 = (freqs > 48.0) & (freqs < 52.0)
    mask_broadband = (freqs > 5.0) & (freqs < 45.0)
    if np.any(mask_50) and np.any(mask_broadband):
        noise_ratio = float(np.mean(psd[mask_50]) / (np.mean(psd[mask_broadband]) + 1e-10))
        noise_50_score = float(np.clip(100 - noise_ratio * 10, 0, 100))
    else:
        noise_50_score = 100.0

    # Overall: penalize each bad heuristic
    overall = 100.0
    if clipping:
        overall -= 30
    if flat_line:
        overall -= 50
    if excessive:
        overall -= 20
    overall = float(np.clip(overall * (contact_score / 100) * (noise_50_score / 100), 0, 100))

    return {
        "overall": overall,
        "electrode_contact": contact_score,
        "noise_50hz": noise_50_score,
        "clipping": clipping,
        "flat_line": flat_line,
        "excessive_amplitude": excessive,
    }


# ---------------------------------------------------------------------------
# FFT Spectrum for display
# ---------------------------------------------------------------------------
def compute_fft_spectrum(samples: np.ndarray, fs: float = EEG_FS, max_freq: float = 40.0):
    """
    Returns (freqs, amplitudes) for display up to max_freq Hz.
    Uses Hanning window to reduce spectral leakage.
    """
    n = len(samples)
    if n < 4:
        return np.array([]), np.array([])
    window = np.hanning(n)
    fft_vals = np.abs(np.fft.rfft(samples * window))
    freqs = np.fft.rfftfreq(n, d=1.0 / fs)
    mask = freqs <= max_freq
    return freqs[mask], fft_vals[mask]
