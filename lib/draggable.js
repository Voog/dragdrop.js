;(function(window) {
  
  'use strict';
  
  // Each Draggable class instance represents single draggable element. They can be created for element that needs
  // drag support explicitly by draggable(element) helper method. Initializing Draggable class methods in your code
  // should be avoided.
  var Draggable = function(el, options) {
    this.el = el;
    this.options = options;
    
    this.init();
  };
  
  Draggable.prototype = {
    
    // Set up event listeners for this draggable.
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
      
      // this.element.data('draggable-id', uniqueId());
    },
    
    // Mouse down event sets up mouse move and mouse up event listeners on window in order to respond to either
    // drag or drag end.
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
    
    // Hanlding mouse move event is where the actual "dragging" will be initiated. It takes mouse coordinates and
    // passes this info along to drag() method. When dragging has not yet been started, it will initiate dragging
    // procedure by calling dragStart() method.
    handleMouseMove: function(event) {
      event.stopPropagation();
      
      if (!this.dragging) {
        this.dragging = true;
        this.dragStart(event);
      }
      
      if (this.dragging) {
        window.requestAnimationFrame(function() {
          this.drag(event);
        }.bind(this));
      }
    },
    
    // Mouse up event stops dragging and removes mousemove and mouseup events from window set in mousedown event
    // handler. It declares dragging as stopped.
    handleMouseUp: function(event) {
      window.removeEventListener('mousemove', this.handleMouseMove);
      window.removeEventListener('mouseup', this.handleMouseUp);
      
      if (this.dragging) {
        this.dragStop(event);
        this.dragging = false;
      }
    },
    
    // Initiates drag helper element and calculates initial position for it. Drag helper element will be moved around
    // within drag() method.
    dragStart: function(event) {
      var rect = this.el.getBoundingClientRect();
      var offset = {
        top: parseInt(rect.top + window.scrollY, 10),
        left: parseInt(rect.left + window.scrollX, 10)
      };
      
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
        this.helper.style.top = (event.pageY - this.offsetDelta.top);
        this.helper.style.left = (event.pageX - this.offsetDelta.left);
        
        document.body.appendChild(this.helper);
      }
      
      this.fillDroppableCache();
    },

    getHelper: function() {
      return this.options.helper();
    },
    
    // Return list of droppable supported DOM elements that accept this draggable
    getDroppables: function() {
      return document.querySelectorAll('[data-droppable]');
    },
    
    // Build position cache of droppables that are interested in accepting this draggable.
    fillDroppableCache: function() {
      this.droppableCache = [];
      
      var droppables = this.getDroppables();
      
      for (var i = 0; i < droppables.length; i++) {
        this.droppableCache.push({rect: droppables[i].getBoundingClientRect(), el: droppables[i]});
      }
    },
    
    // Empty droppable cache built in fillDroppableCache() method
    releaseDroppableCache: function() {
      this.droppableCache = [];
    },
    
    // TODO: When cursor is inside element, this is the closest than anything else.
    getClosestElement: function(x, y, w, h) {
      for (var i = 0, l = this.droppableCache.length; i < l; i++) {
        var rect = this.droppableCache[i].rect,
          x2 = rect.left + window.scrollX, y2 = rect.top + window.scrollY, w2 = rect.width, h2 = rect.height;
        
        if (x + w < x2 || x2 + w2 < x || y + h < y2 || y2 + h2 < y) {
          continue;
        } else {
          return this.droppableCache[i].el;
        }
      }
      
      return null;
    },
    
    // Moves around drag helper element on screen and loooks for elements that might be interested in drag over or
    // drop events.
    drag: function(event) {
      if (this.helper) {
        this.helper.style.top = event.pageY - this.offsetDelta.top;
        this.helper.style.left = event.pageX - this.offsetDelta.left;

        // TODO: Provide option to turn this off -- when doing resizable, finding drop elements is unnecessary, perhaps there are other use cases too for not finding droppables.
        var el = this.getClosestElement((event.pageX - this.offsetDelta.left), (event.pageY - this.offsetDelta.top), this.helper.clientWidth, this.helper.clientHeight);
        if (el) {
          var dragOverEvent = new CustomEvent('draggable:dragover', {});
          
          el.dispatchEvent(dragOverEvent);
        }
      }
    },
    
    // Will be called when drag has stopped either by mouse up event or touch end event.
    //
    // TODO: There is a problem that the target of mouseup/click (if anybody listens for
    // sideclicks etc) on drop is the helper element not the element it is dropped on.
    // Best solution would be to somehow override the target of mouseup and click on drop id
    // dragdrop for everybody. Dunno how though.
    dragStop: function() {
      if (this.helper) {
        this.helper.remove();
      }
      this.helper = null;
      
      this.releaseDroppableCache();
    },
    
    // First touch move on this draggable element initiates drag by calling dragStart() method and subsequent moves
    // will perform dragging by calling drag() method.
    handleTouchMove: function(event) {
      if (event.targetTouches.length > 0) {
        var touch = event.targetTouches[0];
        
        event.preventDefault();
        
        if (!this.lastTouch) {
          this.dragStart(touch);
        }
        
        this.lastTouch = touch;
        
        window.requestAnimationFrame(function() {
          this.drag(event);
        }.bind(this));
      }
    },
    
    // Touch end will declare dragging of this element as stopped.
    handleTouchEnd: function() {
      if (this.lastTouch) {
        this.dragStop(this.lastTouch);
        this.lastTouch = null;
      }
    },
    
    // Touch cancel event will occur when touch moves outside boundaries of viewport or web page gets hidden by
    // application close etc. It will declare dragging of this element as stopped.
    handleTouchCancel: function() {
      if (this.lastTouch) {
        this.dragStop(this.lastTouch);
        this.lastTouch = null;
      }
    }
  };
  
  // Convenience method to initialize draggable element. This should be called by dragdrop client when making given
  // element draggable.
  window.draggable = function(elements, options) {
    for (var i = 0; i < elements.length; i++) {
      new Draggable(elements[i], options);
    }
  };
  
}(this));
