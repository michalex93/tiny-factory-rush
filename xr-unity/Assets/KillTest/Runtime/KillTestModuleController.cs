using UnityEngine;

namespace TinyFactory.KillTest
{
    /// <summary>
    /// Module grab/snap/highlight controller.
    /// Prefer Meta Interaction SDK when META_XR_INTERACTION is defined;
    /// otherwise Editor/dev mouse drag fallback for scaffolding only.
    /// </summary>
    [RequireComponent(typeof(Collider))]
    public sealed class KillTestModuleController : MonoBehaviour
    {
        private KillTestBootstrap _bootstrap;
        private KillTestMetrics _metrics = new KillTestMetrics();
        private IntentHistoryBuffer _intent;
        private TrackingLossMachine _tracking;
        private Renderer _renderer;
        private Color _idle = new Color(0.29f, 0.44f, 0.65f);
        private Color _hover = new Color(0.49f, 0.78f, 0.89f);
        private Color _grab = new Color(0.94f, 0.78f, 0.37f);
        private Color _snapOk = new Color(0.36f, 0.72f, 0.36f);
        private Color _snapBad = new Color(0.85f, 0.33f, 0.31f);
        private bool _grabbed;
        private bool _hovered;
        private float _grabStartedAt;
        private float _rejectFlashUntil;
        private Quaternion _grabStartRotation;
        private bool _rotateObserved;

        public KillTestMetrics Metrics => _metrics;

        public void Initialize(KillTestBootstrap bootstrap)
        {
            _bootstrap = bootstrap;
            var cfg = bootstrap.Config;
            _intent = new IntentHistoryBuffer(cfg.intentHistoryWindowMs);
            _tracking = new TrackingLossMachine(cfg.trackingLossGraceMs);
            _renderer = GetComponent<Renderer>();
            SetColor(_snapOk);

#if META_XR_INTERACTION
            EnsureInteractionSdkHooks();
#endif
        }

        private void Update()
        {
            if (_bootstrap == null) return;
            var now = Time.realtimeSinceStartup * 1000f;
            _intent.Push(now, _grabbed);

            // Approximate tracking: XR node presence. Not Quest evidence.
            var tracked =
                !UnityEngine.XR.XRSettings.isDeviceActive ||
                UnityEngine.XR.InputDevices.GetDeviceAtXRNode(UnityEngine.XR.XRNode.RightHand).isValid ||
                UnityEngine.XR.InputDevices.GetDeviceAtXRNode(UnityEngine.XR.XRNode.LeftHand).isValid;
            var (lost, recovered) = _tracking.Update(now, tracked);
            if (lost) _metrics.Log(KillTestMetricEvent.TrackingLost, _tracking.State.ToString());
            if (recovered) _metrics.Log(KillTestMetricEvent.TrackingRecovered, _tracking.State.ToString());

            if (_grabbed)
            {
                var angle = Quaternion.Angle(_grabStartRotation, transform.rotation);
                if (!_rotateObserved && angle > 8f)
                {
                    _rotateObserved = true;
                    _metrics.Log(KillTestMetricEvent.RotateObserved, $"deg={angle:F1}");
                }
            }

            UpdateColor(now);

#if !META_XR_INTERACTION
            UpdateEditorFallbackDrag();
#endif
        }

        public void BeginGrab()
        {
            _metrics.Log(KillTestMetricEvent.GrabAttempt);
            _metrics.Log(KillTestMetricEvent.GrabSuccess);
            _grabbed = true;
            _grabStartedAt = Time.realtimeSinceStartup * 1000f;
            _grabStartRotation = transform.rotation;
            _rotateObserved = false;
            _bootstrap.OccupiedSlotId = null;
        }

        public void EndGrab()
        {
            if (!_grabbed) return;
            _grabbed = false;
            _metrics.Log(KillTestMetricEvent.Release);
            var duration = Time.realtimeSinceStartup * 1000f - _grabStartedAt;
            _metrics.Log(KillTestMetricEvent.InteractionDuration, $"ms={duration:F0}");

            var decision = SnapLogic.SelectSnapTarget(
                transform.position,
                _bootstrap.CurrentSnapTargets(),
                _bootstrap.Config.snapRadius);

            if (decision.IsSnap)
            {
                var y = decision.Position.y + _bootstrap.Config.moduleSize.y * 0.5f;
                transform.position = new Vector3(decision.Position.x, y, decision.Position.z);
                _bootstrap.OccupiedSlotId = decision.TargetId;
                _metrics.Log(
                    KillTestMetricEvent.SnapSuccess,
                    $"targetId={decision.TargetId} distance={decision.Distance:F3}");
            }
            else
            {
                _rejectFlashUntil = Time.realtimeSinceStartup * 1000f + 450f;
                _metrics.Log(
                    KillTestMetricEvent.SnapRejected,
                    $"reason={decision.RejectReason} nearest={decision.TargetId} distance={decision.Distance:F3}");
                var targets = _bootstrap.CurrentSnapTargets();
                for (var i = 0; i < targets.Length; i++)
                {
                    if (!targets[i].Occupied)
                    {
                        var y = targets[i].Position.y + _bootstrap.Config.moduleSize.y * 0.5f;
                        transform.position = new Vector3(targets[i].Position.x, y, targets[i].Position.z);
                        _bootstrap.OccupiedSlotId = targets[i].Id;
                        break;
                    }
                }
            }
        }

        public void SetHovered(bool hovered) => _hovered = hovered;

        private void UpdateColor(float nowMs)
        {
            if (nowMs < _rejectFlashUntil) SetColor(_snapBad);
            else if (_grabbed) SetColor(_grab);
            else if (_hovered) SetColor(_hover);
            else if (_bootstrap.OccupiedSlotId != null) SetColor(_snapOk);
            else SetColor(_idle);
        }

        private void SetColor(Color c)
        {
            if (_renderer == null) return;
            _renderer.material.color = c;
        }

#if META_XR_INTERACTION
        private void EnsureInteractionSdkHooks()
        {
            // Reflection avoids a hard asmdef dependency while Meta packages finish compiling.
            var grabbableType = System.Type.GetType("Oculus.Interaction.Grabbable, Oculus.Interaction");
            var grabbable = grabbableType != null ? GetComponent(grabbableType) : null;
            if (grabbable == null)
            {
                Debug.LogWarning(
                    "[killtest] META_XR_INTERACTION defined but Grabbable missing on module. " +
                    "Add Interaction SDK GrabInteractable/HandGrabInteractable in the scene wiring pass.");
            }
        }
#endif

#if !META_XR_INTERACTION
        private bool _mouseDrag;
        private Vector3 _dragOffset;

        private void UpdateEditorFallbackDrag()
        {
            // DEV FALLBACK only — not Simulator/Quest hand evidence.
            var cam = Camera.main;
            if (cam == null) return;
            if (Input.GetMouseButtonDown(0))
            {
                var ray = cam.ScreenPointToRay(Input.mousePosition);
                if (Physics.Raycast(ray, out var hit) && hit.transform == transform)
                {
                    _mouseDrag = true;
                    _dragOffset = transform.position - hit.point;
                    BeginGrab();
                }
            }

            if (_mouseDrag && Input.GetMouseButton(0))
            {
                var ray = cam.ScreenPointToRay(Input.mousePosition);
                var plane = new Plane(Vector3.up, new Vector3(0f, transform.position.y, 0f));
                if (plane.Raycast(ray, out var enter))
                {
                    var p = ray.GetPoint(enter) + _dragOffset;
                    transform.position = p;
                    if (Input.GetKey(KeyCode.R))
                    {
                        transform.Rotate(Vector3.up, 90f * Time.deltaTime, Space.World);
                    }
                }
            }

            if (_mouseDrag && Input.GetMouseButtonUp(0))
            {
                _mouseDrag = false;
                EndGrab();
            }

            // Head-gaze/ray highlight fallback via camera center ray.
            if (cam != null)
            {
                var ray = new Ray(cam.transform.position, cam.transform.forward);
                _hovered = Physics.Raycast(ray, out var hit) && hit.transform == transform;
            }
        }
#endif
    }
}
