;(function(window) {
  
  'use strict';
  
  var Draggable = function(el, options) {
    this.el = el;
    this.options = options;
    this.init();
  };
  
  Draggable.prototype = {
    
    init: function() {
      var handle = this.options.handle ? this.el.querySelector(this.options.handle) : this.el;
      
      this.handleMouseDown = this.handleMouseDown.bind(this);
      this.handleMouseMove = this.handleMouseMove.bind(this);
      this.handleMouseUp = this.handleMouseUp.bind(this);
      
      this.handleTouchMove = this.handleTouchMove.bind(this);
      this.handleTouchEnd = this.handleTouchEnd.bind(this);
      this.handleTouchCancel = this.handleTouchCancel.bind(this);
      
      handle.addEventListener('touchmove', this.handleTouchMove);
      handle.addEventListener('touchend', this.handleTouchEnd);
      handle.addEventListener('touchcancel', this.handleTouchCancel);
      handle.addEventListener('mousedown', this.handleMouseDown);
      
    },
    
    handleMouseDown: function(event) {
      // Initiate drag only for left click
      if (event.which !== 1) {
        return;
      }
      
      event.preventDefault();
      event.stopPropagation();
      
      window.addEventListener('mousemove', this.handleMouseMove);
      window.addEventListener('mouseup', this.handleMouseUp);
    },
    
    handleMouseMove: function(event) {
      event.stopPropagation();
      
      if (!this.dragging) {
        this.dragging = true;
        this.dragStart(event);
      }
      
      if (this.dragging) {
        window.requestAnimationFrame($.proxy(function() {
          this.drag(event);
        }, this));
      }
    },
    
    handleMouseUp: function(event) {
      window.removeEventListener('mousemove', this.handleMouseMove);
      window.removeEventListener('mouseup', this.handleMouseUp);
      
      if (this.dragging) {
        this.dragStop(event);
        this.dragging = false;
      }
    },
    
    dragStart: function(event) {
      var offset = {top: 0, left: 0};
      
      this.offsetDelta = {
        top: Math.abs(event.pageY - offset.top),
        left: Math.abs(event.pageX - offset.left)
      };

      // helper function can return falsy to say don't do helper now
      this.helper = this.getHelper();
      if (this.helper) {
        this.helper.style.pointerEvents = 'none';
        this.helper.style.position = 'absolute';
        this.helper.style.zIndex = 99999;
        this.helper.style.top = event.pageY;
        this.helper.style.left = event.pageX;
        
        document.body.appendChild(this.helper);
      }

    getHelper: function() {
      return this.options.helper();
    },
    
    },
    
    drag: function(event) {
      if (this.helper) {
        this.helper.style.top = event.pageY; // - this.offsetDelta.top,
        this.helper.style.left = event.pageX; // - this.offsetDelta.left

      }
      
    },
    
    dragStop: function(event) {
      this.helper && this.helper.remove();
      this.helper = null;
    },
    
    handleTouchMove: function(event) {
      if (event.targetTouches.length > 0) {
        var touch = event.targetTouches[0];
        
        event.preventDefault();
        
        if (!this.lastTouch) {
          this.dragStart(touch);
        }
        
        this.lastTouch = touch;
        
        this.drag(touch);
      }
    },
    
    handleTouchEnd: function(event) {
      if (this.lastTouch) {
        this.dragStop(this.lastTouch);
        this.lastTouch = null;
      }
    },
    
    handleTouchCancel: function(event) {
      if (this.lastTouch) {
        this.dragStop(this.lastTouch);
        this.lastTouch = null;
      }
    }
  };
  
  
  var draggable = function(elements, options) {
    for (var i = 0; i < elements.length; i++) {
      new Draggable(elements[i], options);
    }
  };
  
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = draggable;
    }
    exports.draggable = draggable;
  } else if (typeof define === 'function' && define.amd) {
    define('draggable', function() {
      return draggable;
    });
  } else {
    window.draggable = draggable;
  }
  
}(this));
