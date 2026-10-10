#!/usr/bin/env python3
"""Erzeugt die Tonspur für ein Tattoofin-Reel: lockerer Beat (selbst synthetisiert, lizenzfrei) plus Soundeffekte.

Aufruf: python3 tools/reel-sound.py ziel.wav dauer_in_sekunden '[[0.4,"pop"],[3.0,"whoosh"], ...]'
Wird von tools/render-instagram.mjs automatisch aufgerufen.
"""
import json
import sys
import wave

import numpy as np

SR = 44100
BPM = 104
rng = np.random.default_rng(7)


def env(n, attack=0.004, decay=0.2):
    t = np.arange(n) / SR
    a = np.clip(t / attack, 0, 1)
    return a * np.exp(-t / decay)


def lowpass(x, cutoff):
    """Einpoliger Tiefpass, cutoff als Zahl oder Array (Hz)."""
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x)
    s = 0.0
    for i in range(len(x)):
        s += a[i] * (x[i] - s)
        y[i] = s
    return y


def note(freq, dur, decay, harmonics=(1, 0.5, 0.33, 0.25, 0.2)):
    n = int(dur * SR)
    t = np.arange(n) / SR
    w = sum(amp * np.sin(2 * np.pi * freq * (k + 1) * t) for k, amp in enumerate(harmonics))
    return w * env(n, 0.005, decay)


def kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t / 0.04)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.16)


def clap():
    n = int(0.22 * SR)
    x = rng.standard_normal(n)
    x = x - lowpass(x, 900)
    return x * env(n, 0.002, 0.07) * 0.5


def hat():
    n = int(0.06 * SR)
    x = np.diff(rng.standard_normal(n + 1))
    return x * env(n, 0.001, 0.018) * 0.22


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


def music(dur):
    n = int(dur * SR) + SR
    out = np.zeros(n)
    beat = 60 / BPM
    # I–V–vi–IV in C-Dur, je ein Takt
    chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]
    roots = [36, 31, 33, 29]
    k, h, c = kick(), hat(), clap()

    def put(sig, t, gain=1.0):
        i = int(t * SR)
        if i >= n:
            return
        j = min(n, i + len(sig))
        out[i:j] += sig[: j - i] * gain

    bar = 0
    t = 0.0
    while t < dur + beat:
        ch, root = chords[bar % 4], roots[bar % 4]
        for b in range(4):
            tb = t + b * beat
            put(k, tb, 0.9 if b in (0, 2) else 0.55)
            if b in (1, 3):
                put(c, tb, 0.8)
            put(h, tb + beat / 2, 1.0)
            put(h, tb + beat * 0.75, 0.45)
            # Bass auf Achteln, mit kleinem Oktavsprung
            for e in range(2):
                m = root + (12 if (b == 3 and e == 1) else 0)
                put(note(midi(m), beat / 2, 0.12, (1, 0.35, 0.12)), tb + e * beat / 2, 0.55)
        # Akkord-Stabs: 1 und die „und“ von 2 (synkopiert), dazu ein kleines Arpeggio
        for tt, g in ((t, 0.22), (t + 1.5 * beat, 0.18), (t + 3 * beat, 0.12)):
            for m in ch:
                put(note(midi(m + 12), 0.5, 0.16), tt, g)
        for i, m in enumerate([ch[0], ch[1], ch[2], ch[1]]):
            put(note(midi(m + 24), 0.25, 0.07, (1, 0.2)), t + (2 + i * 0.5) * beat, 0.07)
        t += 4 * beat
        bar += 1
    out = out[: int(dur * SR)]
    fade_in = np.clip(np.arange(len(out)) / (0.25 * SR), 0, 1)
    fade_out = np.clip((len(out) - np.arange(len(out))) / (1.2 * SR), 0, 1)
    return out * fade_in * fade_out


def sfx(name):
    if name == "pop":
        n = int(0.08 * SR)
        t = np.arange(n) / SR
        f = 500 + 900 * (t / t[-1])
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.025) * 0.55
    if name == "tick":
        n = int(0.03 * SR)
        t = np.arange(n) / SR
        return np.sin(2 * np.pi * 2200 * t) * env(n, 0.001, 0.006) * 0.5
    if name == "type":
        n = int(0.02 * SR)
        return np.diff(rng.standard_normal(n + 1)) * env(n, 0.0005, 0.004) * 0.18
    if name in ("whoosh", "swipe"):
        d = 0.45 if name == "whoosh" else 0.28
        n = int(d * SR)
        t = np.arange(n) / n
        x = rng.standard_normal(n)
        cut = 300 + 4500 * np.sin(np.pi * t) ** 2
        y = lowpass(x, cut) - lowpass(x, cut * 0.25)
        return y * np.sin(np.pi * t) ** 1.5 * (0.6 if name == "whoosh" else 0.45)
    if name == "ding":
        a = note(1046.5, 0.9, 0.35, (1, 0.25, 0.08))
        b = note(1568.0, 0.9, 0.4, (1, 0.25, 0.08))
        out = np.zeros(int(1.0 * SR))
        out[: len(a)] += a * 0.32
        o = int(0.09 * SR)
        out[o : o + len(b)] += b[: len(out) - o] * 0.32
        return out
    if name == "stamp":
        n = int(0.3 * SR)
        t = np.arange(n) / SR
        thud = np.sin(2 * np.pi * (60 + 80 * np.exp(-t / 0.03)) * t) * env(n, 0.001, 0.09)
        noise = lowpass(rng.standard_normal(n), 1800) * env(n, 0.001, 0.05)
        return (thud + noise * 0.8) * 0.9
    if name == "scan":
        n = int(0.14 * SR)
        t = np.arange(n) / SR
        return np.sin(2 * np.pi * 1760 * t) * env(n, 0.003, 0.08) * 0.3
    return np.zeros(1)


def main():
    ziel, dauer, events = sys.argv[1], float(sys.argv[2]), json.loads(sys.argv[3])
    m = music(dauer)
    m = m / (np.max(np.abs(m)) + 1e-9) * 0.42
    fx = np.zeros_like(m)
    for t, name in events:
        s = sfx(name)
        i = int(t * SR)
        if i >= len(fx):
            continue
        j = min(len(fx), i + len(s))
        fx[i:j] += s[: j - i]
    mix = np.tanh((m + fx) * 1.4) / np.tanh(1.4)
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.89
    # leichte Stereobreite über ein paar Millisekunden Versatz
    d = int(0.006 * SR)
    left, right = mix, np.concatenate([np.zeros(d), mix[:-d]]) * 0.92 + mix * 0.08
    pcm = (np.stack([left, right], axis=1) * 32767).astype("<i2")
    with wave.open(ziel, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    main()
