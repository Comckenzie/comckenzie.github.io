(function () {
  'use strict';

  const widget = window.kofiWidgetOverlay;
  if (!widget || typeof widget.draw !== 'function') return;

  widget.draw('solargress', {
    type: 'floating-chat',
    'floating-chat.donateButton.text': 'Support me',
    'floating-chat.donateButton.background-color': '#323842',
    'floating-chat.donateButton.text-color': '#fff'
  });
})();
