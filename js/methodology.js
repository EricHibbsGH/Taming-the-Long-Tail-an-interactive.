/*
   methodology.js — Methodology tab: step animations,
   interactive diagram, and intersection observer
*/

registerDeferred('methodology', function () {

  /* Animate steps on scroll/visibility */
  var steps = document.querySelectorAll('.meth-step');
  steps.forEach(function (step, i) {
    step.style.opacity = '0';
    step.style.transform = 'translateX(-12px)';
    step.style.transition = 'opacity .4s ease, transform .4s ease';
    step.style.transitionDelay = (i * 0.1) + 's';
  });

  /* Trigger animations after a brief delay */
  setTimeout(function () {
    steps.forEach(function (step) {
      step.style.opacity = '1';
      step.style.transform = 'translateX(0)';
    });
  }, 150);

  /* Innovation items stagger animation */
  var innovItems = document.querySelectorAll('.innov-item');
  innovItems.forEach(function (item, i) {
    item.style.opacity = '0';
    item.style.transform = 'translateY(8px)';
    item.style.transition = 'opacity .35s ease, transform .35s ease';
    item.style.transitionDelay = (0.3 + i * 0.08) + 's';
  });
  setTimeout(function () {
    innovItems.forEach(function (item) {
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    });
  }, 200);

  /* Step click to highlight */
  steps.forEach(function (step) {
    step.addEventListener('click', function () {
      steps.forEach(function (s) { s.classList.remove('step-active'); });
      step.classList.add('step-active');
    });
  });
});
