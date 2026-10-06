using System;
using System.Collections.Generic;
using UnityEngine;

namespace TinyFactory.KillTest
{
    public enum KillTestMetricEvent
    {
        GrabAttempt,
        GrabSuccess,
        Release,
        SnapSuccess,
        SnapRejected,
        FalseActivation,
        TrackingLost,
        TrackingRecovered,
        InteractionDuration,
        RotateObserved
    }

    public sealed class KillTestMetrics
    {
        public readonly List<(KillTestMetricEvent evt, float t, string detail)> Records =
            new List<(KillTestMetricEvent, float, string)>();

        public void Log(KillTestMetricEvent evt, string detail = null)
        {
            var t = Time.realtimeSinceStartup * 1000f;
            Records.Add((evt, t, detail));
            Debug.Log($"[killtest][metric][SIMULATOR_OR_EDITOR] {evt} {detail}");
        }
    }
}
