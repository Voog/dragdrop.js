;(function(window) {
  
  'use strict';
  
  var Droppable = function(el, options) {
    this.el = el;
    this.options = options;
    this.init();
  };
  
  Droppable.prototype = {
    
    init: function() {
      this.handleDragOverEvent = this.handleDragOverEvent.bind(this);
      
      this.el.setAttribute('data-droppable', true);

      this.el.addEventListener('draggable:dragover', this.handleDragOverEvent);
    },
    
    handleDragOverEvent: function() {
    }
  };
  
  // Convenience method to initialize droppable element. This should be called by dragdrop client when making given
  // element droppable.
  window.droppable = function(elements, options) {
    for (var i = 0; i < elements.length; i++) {
      new Droppable(elements[i], options);
    }
  };
  
}(this));
