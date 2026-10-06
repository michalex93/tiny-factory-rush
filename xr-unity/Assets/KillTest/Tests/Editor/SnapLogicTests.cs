using NUnit.Framework;
using UnityEngine;
using TinyFactory.KillTest;

namespace TinyFactory.KillTest.Tests
{
    public sealed class SnapLogicTests
    {
        private static SnapTarget[] Targets() => new[]
        {
            new SnapTarget { Id = "a", Position = new Vector3(-0.35f, 0.75f, -0.95f), Occupied = false },
            new SnapTarget { Id = "b", Position = new Vector3(0f, 0.75f, -0.95f), Occupied = false },
            new SnapTarget { Id = "c", Position = new Vector3(0.35f, 0.75f, -0.95f), Occupied = true },
        };

        [Test]
        public void Snaps_To_Nearest_Free_Slot_Inside_Radius()
        {
            var d = SnapLogic.SelectSnapTarget(new Vector3(0.02f, 0.78f, -0.93f), Targets(), 0.18f);
            Assert.IsTrue(d.IsSnap);
            Assert.AreEqual("b", d.TargetId);
        }

        [Test]
        public void Rejects_Out_Of_Range()
        {
            var d = SnapLogic.SelectSnapTarget(new Vector3(2f, 0.78f, -0.95f), Targets(), 0.18f);
            Assert.IsFalse(d.IsSnap);
            Assert.AreEqual(SnapRejectReason.OutOfRange, d.RejectReason);
        }

        [Test]
        public void Rejects_Occupied_Nearest()
        {
            var d = SnapLogic.SelectSnapTarget(new Vector3(0.34f, 0.78f, -0.95f), Targets(), 0.18f);
            Assert.IsFalse(d.IsSnap);
            Assert.AreEqual(SnapRejectReason.Occupied, d.RejectReason);
            Assert.AreEqual("c", d.TargetId);
        }

        [Test]
        public void Config_Ranges_Are_Positive()
        {
            var cfg = KillTestConfig.CreateRuntimeDefaults();
            Assert.Greater(cfg.intentHistoryWindowMs, 0f);
            Assert.Greater(cfg.trackingLossGraceMs, 0f);
            Assert.Greater(cfg.snapRadius, 0f);
            Assert.AreEqual(10, cfg.tokenCount);
        }
    }
}
