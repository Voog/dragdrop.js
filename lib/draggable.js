;(function() {
  
  var dnd = this.Dragdrop;
  
  dnd.currentDrags = [];
  
  // Each Draggable class instance represents single draggable element. They can be created for element that needs
  // drag support explicitly by draggable(element) helper method. Initializing Draggable class methods in your code
  // should be avoided.
  dnd.Draggable = function(el, options) {
    this.el = el;
    this.el.__draggable = this;
  
    // Default options
    this.options = {distance: 1, grid: 1, gridOrigin: [0, 0], tolerance: 'closest', autoScroll: true};
  
    for (var attrib in options) {
      if (typeof(options[attrib]) !== 'undefined') {
        this.options[attrib] = options[attrib];
      }
    }
  
    this.init();
  };

  dnd.Draggable.prototype = {
  
    // Set up event listeners for this draggable.
    init: function() {
      this.handle = this.options.handle ? this.el.querySelector(this.options.handle) : this.el;
    
      this.handleMouseDown = this.handleMouseDown.bind(this);
      this.handleMouseMove = this.handleMouseMove.bind(this);
      this.handleMouseUp = this.handleMouseUp.bind(this);
    
      this.handleTouchMove = this.handleTouchMove.bind(this);
      this.handleTouchEnd = this.handleTouchEnd.bind(this);
    
      this.handle.addEventListener('touchmove', this.handleTouchMove);
      this.handle.addEventListener('touchend', this.handleTouchEnd);
      this.handle.addEventListener('touchcancel', this.handleTouchEnd);
      this.handle.addEventListener('mousedown', this.handleMouseDown);
    },

    // Removes draggable event listeners and instance from element
    destroy: function (argument) {
      window.removeEventListener('mousemove', this.handleMouseMove);
      window.removeEventListener('mouseup', this.handleMouseUp);
      this.handle.removeEventListener('touchmove', this.handleTouchMove);
      this.handle.removeEventListener('touchend', this.handleTouchEnd);
      this.handle.removeEventListener('touchcancel', this.handleTouchEnd);
      this.handle.removeEventListener('mousedown', this.handleMouseDown);
      this.el.__draggable = null;
    },
  
    // Mouse down event sets up mouse move and mouse up event listeners on window in order to respond to either
    // drag or drag end.
    handleMouseDown: function(event) {
      // Initiate drag only for left click
      if (event.which !== 1) {
        return;
      }
    
      event.preventDefault();
      
      this.initialPosition = {top: event.pageY, left: event.pageX};
      
      window.addEventListener('mousemove', this.handleMouseMove);
      window.addEventListener('mouseup', this.handleMouseUp);
    },
    
    // Hanlding mouse move event is where the actual "dragging" will be initiated. It takes mouse coordinates and
    // passes this info along to drag() method. When dragging has not yet been started, it will initiate dragging
    // procedure by calling dragStart() method.
    handleMouseMove: function(event) {
      event.stopPropagation();
    
      if (!this.dragging) {
        if (this.isPastInitialDistance(event.pageY, event.pageX)) {
          this.dragging = true;
          this.dragStart(event);
        }
      }
    
      if (this.dragging) {
        this.drag(event);
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
        this.initialPosition = null;
      }
    },
  
    // First touch move on this draggable element initiates drag by calling dragStart() method and subsequent moves
    // will perform dragging by calling drag() method.
    handleTouchMove: function(event) {
      if (event.targetTouches.length > 0) {
        var touch = event.targetTouches[0];
      
        event.preventDefault();
        
        if (!this.initialPosition) {
          this.initialPosition = {top: touch.pageY, left: touch.pageX};
        }
      
        if (!this.dragging) {
          if (this.isPastInitialDistance(touch.pageY, touch.pageX)) {
            this.dragging = true;
            this.dragStart(touch);
          }
        }
        
        if (this.dragging) {
          this.lastTouch = touch;
          this.drag(event);
        }
      }
    },
  
    // Touch end will declare dragging of this element as stopped.
    // 
    // Touch cancel event will occur when touch moves outside boundaries of viewport or web page
    // gets hidden by application close etc. It will declare dragging of this element as stopped.
    handleTouchEnd: function() {
      if (this.dragging) {
        if (this.lastTouch) {
          this.dragStop(this.lastTouch);
          this.lastTouch = null;
        }
        
        this.dragging = false;
        this.initialPosition = null;
      }
    },
  
    // Check if top or left positions are exceeded initial position by the threshold distance set
    // in options. Initial position will be remembered on mouse down or first touch event.
    isPastInitialDistance: function(top, left) {
      return Math.max(Math.abs(left - this.initialPosition.left), Math.abs(top - this.initialPosition.top)) > this.options.distance;
    },
  
    // Get DOM element to be rendered as "proxy object" during the drag.
    getHelper: function() {
      return this.options.helper ? this.options.helper(this.el) : null;
    },
    
    // Return list of droppable supported DOM elements that accept this draggable
    getDroppables: function() {
      if (this.options.droppables) {
          return document.querySelectorAll(this.options.droppables);
      } else {
          return [];
      }
    },
    
    // Build position cache of droppables that are interested in accepting this draggable.
    // TODO: Update droppable cache during auto scroll.
    fillDroppableCache: function() {
      this.droppableCache = this.getDroppables();
    },
  
    // Empty droppable cache built in fillDroppableCache() method
    releaseDroppableCache: function() {
      this.droppableCache = [];
    },

    // Internal method to find the closest element to draggable helper.
    getClosestElement: function(element) {
      if (this.options.tolerance == 'overlap') {
        return dnd.utils.getOverlappingElement(element, this.droppableCache);
      } else {
        return dnd.utils.getClosestElement(element, this.droppableCache);
      }
    },
    
    // Check if drop target element is excluded from configuration. It is being used not to prevent
    // triggering drop events beind other elements etc.
    isExcludedTarget: function(element) {
      return this.options.exclude && dnd.utils.closest(element, this.options.exclude) != null;
    },
  
    // Build data object to be passed on with drag events.
    getEventDetails: function() {
      var details = {
        helper: this.helper, draggable: this.el, payload: this.payload,
        pageX: this.position.pageX, pageY: this.position.pageY, clientX: this.position.clientX, clientY: this.position.clientY
      };
    
      if (this.position && this.lastposition) {
        details.deltaX = this.lastposition.pageX - this.position.pageX;
        details.deltaY = this.lastposition.pageY - this.position.pageY;
      }
    
      return details;
    },
  
    // Try to get payload object from draggable user.
    getPayload: function() {
      if (dnd.utils.isFunction(this.options.payload)) {
        return this.options.payload(this.el);
      } else if (dnd.utils.isObject(this.options.payload)) {
        return this.options.payload;
      } else {
        return {};
      }
    },
    
    // When using grid lines for dragging, grid will start at the [0,0] from the page by default.
    // It is possible to offset the grid at the desired position on the page by providing either
    // fixed gridOrigin [x,y] point value or providing a callback that will get called before each
    // drag which must return [x,y] point for grid offset.
    calculateGridOffset: function() {
      var origin;
      
      if (dnd.utils.isFunction(this.options.gridOrigin)) {
        origin = this.options.gridOrigin();
      } else {
        origin = this.options.gridOrigin;
      }
      
      return [origin[0] % parseInt(this.options.grid, 10), origin[1] % parseInt(this.options.grid, 10)];
    },
    
    // Calculate offset for helper element. Helper position must match the upper left corner of
    // draggable element but pointer must be positioned inside helper
    //
    // When pointer position is initially outside the helper area, the offset will be changed to
    // helper center position in order to place the helper below the pointer.
    calculateHelperOffset: function(helper, pointerX, pointerY) {
      var rect = this.el.getBoundingClientRect(),
          helperIsDetached = !helper.parentNode,
          helperWidth, helperHeight, offset, offsetDelta;
      
      offset = {
        top: parseInt(rect.top + window.pageYOffset, 10),
        left: parseInt(rect.left + window.pageXOffset, 10)
      };
      
      if (helperIsDetached) {
        document.body.appendChild(helper);
      }
      
      helperWidth = helper.clientWidth;
      helperHeight = helper.clientHeight;
      
      if (helperIsDetached) {
        document.body.removeChild(helper);
      }
      
      return {
        top: (pointerY > offset.top + helperHeight) ? Math.ceil(helperHeight / 2) : Math.abs(pointerY - offset.top),
        left: (pointerX > offset.left + helperWidth) ? Math.ceil(helperWidth / 2) : Math.abs(pointerX - offset.left)
      };
    },
    
    // Takes event coordinates (page / client) and re-calculates them to the closest grid points.
    // Grid step is configured with options.grid configuration parameter.
    calculatePositionWithGrid: function(event) {
      return {
        pageX: this.roundToGrid(event.pageX, this.gridOffset[1]),
        pageY: this.roundToGrid(event.pageY, this.gridOffset[0]),
        clientX: this.roundToGrid(event.clientX, this.gridOffset[1]),
        clientY: this.roundToGrid(event.clientY, this.gridOffset[0])
      };
    },
    
    // Rounds single value to grid point.
    roundToGrid: function(value, offset) {
      if (this.options.grid > 1) {
        return (Math.round(value / this.options.grid) * this.options.grid) + offset;
      } else {
        return value;
      }
    },
  
    // Initiates drag helper element and calculates initial position for it. Drag helper element will be moved around
    // within drag() method.
    //
    // When autoscroll is enabled for this draggable, remember scrollable width and height for the duration of this
    // drag. It must be calculated only once as the width and height will change during auto scroll.
    dragStart: function(event) {
      if (this.options.autoScroll) {
        this.autoScrollBounds = {width: document.body.scrollWidth, height: document.body.scrollHeight};
      }
      
      this.payload = this.getPayload();
    
      this.lastposition = null;
    
      // helper function can return falsy to say don't do helper now
      this.helper = this.getHelper();
      if (this.helper) {
        this.offsetDelta = this.calculateHelperOffset(this.helper, event.pageX, event.pageY);
        
        this.helper.style.position = 'absolute';
        this.helper.style.zIndex = 99999;
        this.helper.style.top = (event.pageY - this.offsetDelta.top) + 'px';
        this.helper.style.left = (event.pageX - this.offsetDelta.left) + 'px';
        this.helper.style.webkitTransform = 'translate3d(0,0,0)';
        this.helper.style.pointerEvents = 'none';
      
        document.body.appendChild(this.helper);
      }
      
      this.fillDroppableCache();
      
      dnd.currentDrags.push(this);
      
      this.gridOffset = this.calculateGridOffset();
      this.position = this.calculatePositionWithGrid(event);
      
      this.el.dispatchEvent(new CustomEvent('draggable:dragstart', {bubbles: true, detail: this.getEventDetails()}));
    },

    // Moves around drag helper element on screen and loooks for elements that might be interested in drag over or
    // drop events.
    drag: function(event) {
      if (this.options.autoScroll) {
        this.edgeMove(event);
      }
    
      this.position = this.calculatePositionWithGrid(event);
      
      if (!this.lastposition) {
        this.lastposition = this.position;
      } else {
        if (this.lastposition.pageY == this.position.pageY && this.lastposition.pageX == this.position.pageX) {
          return;
        }
      }
      
      if (this.helper) {
        this.helper.style.top = this.position.pageY - this.offsetDelta.top + 'px';
        this.helper.style.left = this.position.pageX - this.offsetDelta.left + 'px';
      }
      
      this.el.dispatchEvent(new CustomEvent('draggable:drag', {bubbles: true, detail: this.getEventDetails()}));

      // When there are no droppables, do not bother finding closest elements.
      // Helper must always be present if dragleave, dragenter or dragover events are needed.
      if (this.droppableCache.length > 0 && this.helper) {
        var el = null;
        
        if (!this.isExcludedTarget(document.elementFromPoint(event.clientX, event.clientY))) {
          el = this.getClosestElement(this.helper);
        }
        
        if (!el) {
          // When moved out from drop area that was a possible target, tell that we've left the poor guy.
          if (this.lastTarget) {
            this.lastTarget.dispatchEvent(new CustomEvent('draggable:dragleave', {bubbles: true, detail: this.getEventDetails()}));
            this.lastTarget = null;
          }
          
          this.lastposition = this.position;
          
          return;
        }
    
        if (el !== this.lastTarget) {
          if (this.lastTarget) {
            this.lastTarget.dispatchEvent(new CustomEvent('draggable:dragleave', {bubbles: true, detail: this.getEventDetails()}));
          }
          this.lastTarget = el;
          el.dispatchEvent(new CustomEvent('draggable:dragenter', {bubbles: true, detail: this.getEventDetails()}));
        }
    
        el.dispatchEvent(new CustomEvent('draggable:dragover', {bubbles: true, detail: this.getEventDetails()}));
      }
    
      this.lastposition = this.position;
    },
  
    // Will be called when drag has stopped either by mouse up event or touch end event.
    dragStop: function(event) {
      if (this.options.autoScroll) {
        this.stopAutoScroll();
      }
    
      this.releaseDroppableCache();
    
      if (this.lastTarget) {
        this.lastTarget.dispatchEvent(new CustomEvent('draggable:drop', {bubbles: true, detail: this.getEventDetails()}));
        this.lastTarget.dispatchEvent(new CustomEvent('draggable:dragleave', {bubbles: true, detail: this.getEventDetails()}));
        this.lastTarget = null;
      }
    
      if (this.helper) {
        this.helper.parentNode.removeChild(this.helper);
      }
      this.helper = null;
    
      this.el.dispatchEvent(new CustomEvent('draggable:dragend', {bubbles: true, detail: this.getEventDetails()}));

      dnd.currentDrags.splice(dnd.currentDrags.indexOf(this), 1);
    },
  
    startAutoScroll: function() {
      this.autoScroll.scrolling = true;
      if (this.autoScroll.currentScroll) {
        window.cancelAnimationFrame(this.autoScroll.currentScroll);
      }

      this.autoScroll.prevTime = new Date().getTime();
      this.autoScroll.currentScroll = window.requestAnimationFrame(this.performAutoScroll.bind(this));
    },
  
    performAutoScroll: function() {
      var now = new Date().getTime(),
          dt = (now - this.autoScroll.prevTime) / 1000,
          s = this.autoScroll.speed * dt;

      if (s >= 1) {
        window.scrollBy(
          ((this.autoScroll.x > 0 && this.autoScrollBounds.width > window.pageXOffset + window.innerWidth) || (this.autoScroll.x < 0 && window.pageXOffset > 0) ? this.autoScroll.x * s : 0),
          ((this.autoScroll.y > 0 && this.autoScrollBounds.height > window.pageYOffset + window.innerHeight) || (this.autoScroll.y < 0 && window.pageYOffset > 0) ? this.autoScroll.y * s : 0)
        );
        this.autoScroll.prevTime = now;
      
        if (this.helper) {
          this.helper.style.top = this.roundToGrid(this.autoScroll.clientY + window.pageYOffset - this.offsetDelta.top) + 'px';
          this.helper.style.left = this.roundToGrid(this.autoScroll.clientX + window.pageXOffset - this.offsetDelta.left) + 'px';
        }
      }

      if (this.autoScroll.scrolling) {
        window.cancelAnimationFrame(this.autoScroll.currentScroll);
        this.autoScroll.currentScroll = window.requestAnimationFrame(this.performAutoScroll.bind(this));
      }
    },
  
    stopAutoScroll: function() {
      this.autoScroll.scrolling = false;
      if (this.autoScroll.currentScroll) {
        window.cancelAnimationFrame(this.autoScroll.currentScroll);
      }
    },
  
    edgeMove: function(event) {
      var margin = 60;
    
      var top = event.clientY < margin,
          right = event.clientX > window.innerWidth - margin,
          bottom = event.clientY > window.innerHeight - margin,
          left = event.clientX < margin;

      this.autoScroll = {
        clientX: event.clientX,
        clientY: event.clientY,
        speed: 500,
        x: (right ? 1 : left ? -1 : 0),
        y: (bottom ? 1 : top ? -1 : 0)
      };
    
      if (this.autoScroll.x != 0 || this.autoScroll.y != 0) {
        this.startAutoScroll();
      } else {
        this.stopAutoScroll();
      }
    }
  };

  // Convenience method to initialize draggable element. This should be called by dragdrop client when making given
  // element draggable.
  dnd.draggable = function(elements, options) {
    Array.prototype.slice.call(dnd.utils.normalize(elements)).forEach(function(element) {
      if (!element.__draggable) {
        new dnd.Draggable(element, options);
      }
    });
  };

  dnd.draggables = function(elements, items, options) {
    Array.prototype.slice.call(dnd.utils.normalize(elements)).forEach(function(element) {
      element.addEventListener('mouseover', function(event) {
        Array.prototype.slice.call(element.querySelectorAll(items)).forEach(function(child) {
          if (child.contains(event.target)) {
            dnd.draggable(dnd.utils.closest(event.target, items), options);
          }
        });
      });
    
      element.addEventListener('touchstart', function(event) {
        Array.prototype.slice.call(element.querySelectorAll(items)).forEach(function(child) {
          if (child.contains(event.target)) {
            dnd.draggable([dnd.utils.closest(event.target, items)], options);
          }
        });
      });
    });
  };
  
}(this));
