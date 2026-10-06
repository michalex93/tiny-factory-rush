using NUnit.Framework;
using TinyFactory.KillTest;

namespace TinyFactory.KillTest.Tests
{
    public sealed class IntentLogicTests
    {
        [Test]
        public void Intent_Buffer_Forgets_Outside_Window()
        {
            var buf = new IntentHistoryBuffer(100f);
            buf.Push(0f, true);
            buf.Push(50f, false);
            Assert.IsTrue(buf.HadGrabIntent(90f));
            Assert.IsFalse(buf.HadGrabIntent(160f));
        }

        [Test]
        public void Tracking_Loss_Uses_Tunable_Grace()
        {
            var m = new TrackingLossMachine(200f);
            var r0 = m.Update(0f, false);
            Assert.IsFalse(r0.lost);
            Assert.AreEqual(TrackingState.Grace, m.State);
            var r1 = m.Update(201f, false);
            Assert.IsTrue(r1.lost);
            Assert.AreEqual(TrackingState.Lost, m.State);
            var r2 = m.Update(210f, true);
            Assert.IsTrue(r2.recovered);
            Assert.AreEqual(TrackingState.Tracked, m.State);
        }
    }
}
