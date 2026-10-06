using System;
using UnityEngine;

namespace TinyFactory.KillTest
{
    [Serializable]
    public struct SnapTarget
    {
        public string Id;
        public Vector3 Position;
        public bool Occupied;
    }

    public enum SnapRejectReason
    {
        None,
        OutOfRange,
        Occupied,
        NoTargets
    }

    public readonly struct SnapDecision
    {
        public readonly bool IsSnap;
        public readonly string TargetId;
        public readonly Vector3 Position;
        public readonly float Distance;
        public readonly SnapRejectReason RejectReason;

        public SnapDecision(
            bool isSnap,
            string targetId,
            Vector3 position,
            float distance,
            SnapRejectReason rejectReason)
        {
            IsSnap = isSnap;
            TargetId = targetId;
            Position = position;
            Distance = distance;
            RejectReason = rejectReason;
        }

        public static SnapDecision Snap(string id, Vector3 pos, float dist) =>
            new SnapDecision(true, id, pos, dist, SnapRejectReason.None);

        public static SnapDecision Reject(SnapRejectReason reason, string nearestId, float dist) =>
            new SnapDecision(false, nearestId, default, dist, reason);
    }

    public static class SnapLogic
    {
        public static SnapDecision SelectSnapTarget(
            Vector3 modulePosition,
            SnapTarget[] targets,
            float snapRadius)
        {
            if (targets == null || targets.Length == 0)
            {
                return SnapDecision.Reject(SnapRejectReason.NoTargets, null, -1f);
            }

            SnapTarget nearest = default;
            var nearestDist = float.PositiveInfinity;
            var found = false;
            for (var i = 0; i < targets.Length; i++)
            {
                var d = Vector3.Distance(modulePosition, targets[i].Position);
                if (d < nearestDist)
                {
                    nearestDist = d;
                    nearest = targets[i];
                    found = true;
                }
            }

            if (!found || nearestDist > snapRadius)
            {
                return SnapDecision.Reject(
                    SnapRejectReason.OutOfRange,
                    found ? nearest.Id : null,
                    found ? nearestDist : -1f);
            }

            if (nearest.Occupied)
            {
                return SnapDecision.Reject(SnapRejectReason.Occupied, nearest.Id, nearestDist);
            }

            return SnapDecision.Snap(nearest.Id, nearest.Position, nearestDist);
        }

        public static bool IsValidSnapPlacement(
            Vector3 modulePosition,
            SnapTarget[] targets,
            float snapRadius) =>
            SelectSnapTarget(modulePosition, targets, snapRadius).IsSnap;
    }
}
