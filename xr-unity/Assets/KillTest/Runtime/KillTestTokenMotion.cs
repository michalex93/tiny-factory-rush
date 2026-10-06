using UnityEngine;

namespace TinyFactory.KillTest
{
    /// <summary>Deterministic oval path — runtime/render load only, not factory sim.</summary>
    public sealed class KillTestTokenMotion : MonoBehaviour
    {
        public float Phase;
        private Vector3 _tableCenter = new Vector3(0f, 0.72f, -0.85f);

        private void Update()
        {
            Phase += Time.deltaTime * 0.7f;
            transform.position = new Vector3(
                _tableCenter.x + Mathf.Cos(Phase) * 0.38f,
                _tableCenter.y + 0.12f,
                _tableCenter.z + Mathf.Sin(Phase) * 0.22f - 0.05f);
        }
    }
}
