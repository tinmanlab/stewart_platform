/* Small entry points reuse the existing controller presets; no parallel physics. */
(function () {
  'use strict';
  const lab = window.lab;
  if (!lab) return;
  const descriptions = {
    ik: 'Move the target. The motors move the platform; the outline is only a goal.',
    compliance: 'A sustained +X force of 16 N acts against K=800 N/m. Look for about 20 mm, then release all forces in Dynamics.',
    gravity: 'No position feedback: the active motors compensate the modelled weight. Push to see why this is not position control.',
    passive: 'All six linear joints are passive springs and dampers. The motor is off, but the spring can still support weight.',
    fk: 'Copy target lengths, solve FK, then apply the solution as a control target. The solver does not move the physical state directly.'
  };
  lab.loadLesson = function (name) {
    if (!Object.hasOwn(descriptions, name)) return false;
    if (['compliance', 'gravity', 'passive'].includes(name)) lab.preset(name);
    else {
      lab.reset();
      const goal = Stewart.homeState(lab.sim.g);
      goal.p = [0.025, -0.015, 0.575];
      goal.q = Stewart.qEuler(4 * Math.PI / 180, -3 * Math.PI / 180, 5 * Math.PI / 180);
      lab.setTarget(goal);
      lab.setMode('ik');
    }
    lab.tab(name === 'fk' ? 'kinematics' : name === 'passive' ? 'joints' : 'control');
    document.getElementById('lessonHint').textContent = descriptions[name];
    lab.updateTelemetry();
    return true;
  };
  const name = new URLSearchParams(location.search).get('demo');
  if (name) lab.loadLesson(name);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lab.running = false;
    lab.updateTelemetry();
  }
})();
