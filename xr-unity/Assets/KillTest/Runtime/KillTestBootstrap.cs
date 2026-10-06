using UnityEngine;

namespace TinyFactory.KillTest
{
    /// <summary>
    /// Builds the shared kill-test scene at runtime:
    /// 1 fallback table, 1 large module, 3 snap pads, 10 tokens.
    /// Interaction wiring lives in <see cref="KillTestModuleController"/>.
    /// Table: DEV FALLBACK plane (Simulator synthetic room ≠ real physical table).
    /// </summary>
    public sealed class KillTestBootstrap : MonoBehaviour
    {
        [SerializeField] private KillTestConfig config;

        public KillTestConfig Config => config;
        public Transform Module { get; private set; }
        public Transform[] Pads { get; private set; }
        public Transform[] Tokens { get; private set; }
        public string OccupiedSlotId { get; set; } = "slot-center";

        public static readonly string[] SlotIds = { "slot-left", "slot-center", "slot-right" };

        private void Awake()
        {
            if (config == null)
            {
                config = KillTestConfig.CreateRuntimeDefaults();
            }

            BuildScene();
            Debug.Log(
                "[killtest] scene ready mode=SIMULATOR_OR_EDITOR table=DEV_FALLBACK_PLANE " +
                $"snapRadius={config.snapRadius} intentHistoryWindowMs={config.intentHistoryWindowMs} " +
                $"trackingLossGraceMs={config.trackingLossGraceMs} (TUNABLE — not design truth)");
        }

        private void BuildScene()
        {
            var table = GameObject.CreatePrimitive(PrimitiveType.Cube);
            table.name = "killtest-fallback-table";
            table.transform.SetParent(transform, false);
            table.transform.localPosition = new Vector3(0f, 0.72f, -0.85f);
            table.transform.localScale = new Vector3(1.2f, 0.04f, 0.7f);
            var tableMat = new Material(Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard"));
            tableMat.color = new Color(0.55f, 0.45f, 0.33f);
            table.GetComponent<MeshRenderer>().sharedMaterial = tableMat;

            var tableTopY = 0.72f + 0.02f;
            Pads = new Transform[3];
            var xs = new[] { -0.35f, 0f, 0.35f };
            for (var i = 0; i < 3; i++)
            {
                var pad = GameObject.CreatePrimitive(PrimitiveType.Cube);
                pad.name = $"killtest-snap-{SlotIds[i]}";
                pad.transform.SetParent(transform, false);
                pad.transform.localPosition = new Vector3(xs[i], tableTopY + 0.01f, -0.95f);
                pad.transform.localScale = new Vector3(0.22f, 0.02f, 0.22f);
                var padMat = new Material(Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard"));
                padMat.color = new Color(0.18f, 0.24f, 0.28f);
                pad.GetComponent<MeshRenderer>().sharedMaterial = padMat;
                Pads[i] = pad.transform;
            }

            var moduleGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
            moduleGo.name = "killtest-module";
            moduleGo.transform.SetParent(transform, false);
            moduleGo.transform.localScale = config.moduleSize;
            var center = Pads[1].localPosition;
            moduleGo.transform.localPosition = new Vector3(
                center.x,
                center.y + config.moduleSize.y * 0.5f,
                center.z);
            Module = moduleGo.transform;

            var controller = moduleGo.AddComponent<KillTestModuleController>();
            controller.Initialize(this);

            Tokens = new Transform[config.tokenCount];
            for (var i = 0; i < config.tokenCount; i++)
            {
                var token = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                token.name = $"killtest-token-{i}";
                token.transform.SetParent(transform, false);
                token.transform.localScale = Vector3.one * 0.06f;
                var tokenMat = new Material(Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard"));
                tokenMat.color = new Color(0.91f, 0.66f, 0.22f);
                token.GetComponent<MeshRenderer>().sharedMaterial = tokenMat;
                Object.Destroy(token.GetComponent<Collider>());
                Tokens[i] = token.transform;
                token.AddComponent<KillTestTokenMotion>().Phase = (i / (float)config.tokenCount) * Mathf.PI * 2f;
            }
        }

        public SnapTarget[] CurrentSnapTargets()
        {
            var targets = new SnapTarget[Pads.Length];
            for (var i = 0; i < Pads.Length; i++)
            {
                targets[i] = new SnapTarget
                {
                    Id = SlotIds[i],
                    Position = Pads[i].position,
                    Occupied = OccupiedSlotId == SlotIds[i]
                };
            }

            return targets;
        }
    }
}
