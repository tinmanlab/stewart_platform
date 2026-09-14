/* Guided entry points. Reuse the real controllers; never animate physical poses. */
(function () {
  'use strict';
  const lab = window.lab;
  if (!lab) return;
  const $ = id => document.getElementById(id);
  const lessons = {
    ik: {title: 'Move', hint: 'Pose → six lengths. Watch the solid platform catch the target outline. Which legs extend?', action: 'Try the opposite tilt'},
    fk: {title: 'Solve FK', hint: 'Six lengths → pose. A local numerical solver has reconstructed this target. Inspect the residual below.', action: 'Apply solved target'},
    compliance: {title: 'Push', hint: '+X force 16 N, stiffness 800 N/m. Predict a settled displacement of 20 mm, then release the force.', action: 'Release the 16 N force'},
    gravity: {title: 'Gravity', hint: 'Motors compensate modelled weight, without position feedback. Push once: does the table return?', action: 'Push once · 2 N·s'},
    passive: {title: 'Passive', hint: 'Six sliders are springs and dampers, not motors. Change P1 stiffness or damping in the inspector.', action: 'Inspect spring P1'}
  };
  let selected = null;
  let exampleSimulation = null;
  let opposite = false;
  const style = document.createElement('style');
  style.textContent = `
    .lesson-bar{padding:14px 16px;background:#f0f7f5;border-bottom:1px solid #cedfdc;flex-shrink:0}
    .lesson-bar h2{font-size:12px;letter-spacing:.03em;margin:0 0 9px}
    .lesson-buttons{display:flex;gap:5px;flex-wrap:wrap}
    .lesson-buttons button{padding:7px 9px;font-size:11px;flex:1;min-width:48px}
    .lesson-buttons [aria-pressed=true]{background:#106d66;color:white;border-color:#106d66}
    .lesson-bar .lesson-hint{border:0;background:none;padding:0;margin:10px 0 8px;font-size:11px;min-height:34px}
    .lesson-bar small{display:block;margin-top:9px;font-size:10px;color:#5c7370}
    #lessonAction{font-size:11px;background:#fff;width:100%;text-align:left}
    #lessonAction[hidden]{display:none}
    .lesson-bar a{color:#116c65}
    @media(max-width:740px){.lesson-bar{padding:16px}.lesson-buttons button{padding:10px 8px}}
  `;
  document.head.appendChild(style);
  const bar = document.createElement('section');
  bar.id = 'lessonBar';
  bar.className = 'lesson-bar';
  bar.setAttribute('aria-label', 'Guided experiments');
  const heading = document.createElement('h2');
  heading.textContent = 'START WITH AN EXPERIMENT';
  const buttons = document.createElement('div');
  buttons.className = 'lesson-buttons';
  Object.entries(lessons).forEach(([name, lesson]) => {
    const button = document.createElement('button');
    button.textContent = lesson.title;
    button.dataset.lesson = name;
    button.setAttribute('aria-pressed', 'false');
    button.onclick = () => lab.loadLesson(name);
    buttons.append(button);
  });
  // Move the existing status node above the tabs, so FK/passive help stays visible.
  const hint = $('lessonHint');
  hint.textContent = 'Choose one experiment. Change a parameter, predict the result, then watch the physics.';
  const action = document.createElement('button');
  action.id = 'lessonAction';
  action.hidden = true;
  const note = document.createElement('small');
  note.textContent = 'Examples reset geometry and settings. Save your project first. Space pauses; Reset recovers.';
  const reading = document.createElement('output');
  reading.id = 'lessonReading';
  reading.setAttribute('aria-live', 'off');
  reading.style.cssText = 'display:block;margin:8px 0;font:12px/1.5 ui-monospace,monospace;color:#164c47';
  bar.append(heading, buttons, hint, reading, action, note);
  setInterval(() => {
    const s = lab.sim;
    reading.textContent = `X ${(s.state.p[0]*1000).toFixed(2)} mm | Fx ${s.settings.external[0].toFixed(1)} N | ${s.joints.filter(j => j.slider.mode === 'active').length}/6 motors`;
  }, 250);
  document.querySelector('.sidebar').prepend(bar);
  // Let Space activate a focused native control rather than global playback.
  document.body.addEventListener('keydown', event => {
    if (event.code === 'Space' && event.target.closest('button,a,summary')) event.stopPropagation();
  });
  Object.defineProperty(lab, 'lesson', {get: () => selected});
  lab.clearLesson = () => {
    selected=null;exampleSimulation=null;action.hidden=true;
    hint.textContent='Choose an experiment, or open Ball Lab. Presets start a fresh run; save your project first.';
    buttons.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));
  };


  lab.loadLesson = function (name) {
    if (!Object.hasOwn(lessons, name)) return false;
    // A reproducible example must not inherit custom masses, gains or joint states.
    lab.reset(Stewart.createGeometry());
    if (['compliance', 'gravity', 'passive'].includes(name)) lab.preset(name);
    else {
      const goal = Stewart.homeState(lab.sim.g);
      goal.p = [0.025, -0.015, 0.575];
      goal.q = Stewart.qEuler(4 * Math.PI / 180, -3 * Math.PI / 180, 5 * Math.PI / 180);
      lab.setTarget(goal);
      lab.setMode('ik');
    }
    lab.tab(name === 'fk' ? 'kinematics' : name === 'passive' ? 'joints' : 'control');
    if (name === 'passive') lab.selectJoint({i: 0, type: 'slider'});
    if (name === 'fk') {
      $('fkFromTarget').click();
      $('solveFk').click();
    }
    selected = name;
    exampleSimulation = lab.sim;
    opposite = false;
    hint.textContent = lessons[name].hint;
    action.textContent = lessons[name].action;
    action.hidden = false;
    buttons.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lesson === name)));
    lab.running = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    lab.updateTelemetry();
    return true;
  };
  action.onclick = () => {
    if (lab.sim !== exampleSimulation) {
      hint.textContent = 'The project changed. Choose an experiment again to reset its reference conditions.';
      action.hidden = true;
      return;
    }
    if (selected === 'compliance') {
      $('releaseForce').click();
      hint.textContent = 'The sustained force is now zero. Watch X return toward its target. Select Push again to repeat.';
      action.hidden = true;
    } else if (selected === 'gravity') $('pushX').click();
    else if (selected === 'passive') { lab.tab('joints'); lab.selectJoint({i: 0, type: 'slider'}); }
    else if (selected === 'fk') $('applyFk').click();
    else if (selected === 'ik') {
      opposite = !opposite;
      const goal = Stewart.homeState(lab.sim.g);
      goal.p = [opposite ? -0.035 : 0.025, 0, 0.575];
      goal.q = Stewart.qEuler((opposite ? -7 : 4) * Math.PI / 180, 0, 0);
      lab.setTarget(goal);
    }
    lab.updateTelemetry();
  };
  const name = new URLSearchParams(location.search).get('demo');
  if (name) lab.loadLesson(name);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lab.running = false;
    lab.updateTelemetry();
  }
})();
