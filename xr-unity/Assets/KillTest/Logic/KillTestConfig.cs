using UnityEngine;

namespace TinyFactory.KillTest
{
    /// <summary>
    /// TUNABLE temporary defaults for stack comparison — not design truth.
    /// Do not copy timing constants from other games as product law.
    /// </summary>
    [CreateAssetMenu(menuName = "TinyFactory/KillTest Config")]
    public sealed class KillTestConfig : ScriptableObject
    {
        [Tooltip("TUNABLE")]
        public float intentHistoryWindowMs = 180f;

        [Tooltip("TUNABLE")]
        public float trackingLossGraceMs = 250f;

        [Tooltip("TUNABLE meters")]
        public float snapRadius = 0.18f;

        public Vector3 moduleSize = new Vector3(0.28f, 0.16f, 0.22f);
        public int tokenCount = 10;

        public static KillTestConfig CreateRuntimeDefaults()
        {
            var cfg = CreateInstance<KillTestConfig>();
            cfg.intentHistoryWindowMs = 180f;
            cfg.trackingLossGraceMs = 250f;
            cfg.snapRadius = 0.18f;
            cfg.moduleSize = new Vector3(0.28f, 0.16f, 0.22f);
            cfg.tokenCount = 10;
            return cfg;
        }
    }
}
