using System.Collections.Generic;

namespace TinyFactory.KillTest
{
    public enum TrackingState
    {
        Tracked,
        Grace,
        Lost
    }

    public sealed class IntentHistoryBuffer
    {
        private readonly List<(float t, bool grabbing)> _samples = new List<(float, bool)>();
        private float _windowMs;

        public IntentHistoryBuffer(float windowMs) => _windowMs = windowMs;

        public int Size => _samples.Count;

        public void SetWindowMs(float windowMs)
        {
            _windowMs = windowMs;
            Prune(Now());
        }

        public void Push(float t, bool grabbing)
        {
            _samples.Add((t, grabbing));
            Prune(t);
        }

        public bool HadGrabIntent(float now)
        {
            Prune(now);
            for (var i = 0; i < _samples.Count; i++)
            {
                if (_samples[i].grabbing) return true;
            }

            return false;
        }

        public float RecentGrabFraction(float now)
        {
            Prune(now);
            if (_samples.Count == 0) return 0f;
            var grabs = 0;
            for (var i = 0; i < _samples.Count; i++)
            {
                if (_samples[i].grabbing) grabs++;
            }

            return (float)grabs / _samples.Count;
        }

        public void Clear() => _samples.Clear();

        private void Prune(float now)
        {
            var cutoff = now - _windowMs;
            while (_samples.Count > 0 && _samples[0].t < cutoff)
            {
                _samples.RemoveAt(0);
            }
        }

        private static float Now() =>
            UnityEngine.Time.realtimeSinceStartup * 1000f;
    }

    public sealed class TrackingLossMachine
    {
        private TrackingState _state = TrackingState.Tracked;
        private float? _lossStartedAt;
        private float _graceMs;

        public TrackingLossMachine(float graceMs) => _graceMs = graceMs;

        public TrackingState State => _state;

        public void SetGraceMs(float graceMs) => _graceMs = graceMs;

        public (bool lost, bool recovered) Update(float nowMs, bool isTracked)
        {
            var lost = false;
            var recovered = false;

            if (isTracked)
            {
                if (_state == TrackingState.Lost || _state == TrackingState.Grace)
                {
                    recovered = _state == TrackingState.Lost;
                }

                _state = TrackingState.Tracked;
                _lossStartedAt = null;
                return (lost, recovered);
            }

            if (_state == TrackingState.Tracked)
            {
                _state = TrackingState.Grace;
                _lossStartedAt = nowMs;
                return (lost, recovered);
            }

            if (_state == TrackingState.Grace && _lossStartedAt.HasValue)
            {
                if (nowMs - _lossStartedAt.Value >= _graceMs)
                {
                    _state = TrackingState.Lost;
                    lost = true;
                }
            }

            return (lost, recovered);
        }
    }
}
