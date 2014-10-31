/*! Drag & Drop library - v - 2014-10-31
* Copyright (c) 2014 Priit Haamer; Licensed  */
;(function() {
  
  // CustomEvent constructor polyfill for IE9 and IE10
  function CustomEvent(event, params) {
    params = params || {bubbles: false, cancelable: false, detail: undefined};
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
    return evt;
   };

  CustomEvent.prototype = this.Event.prototype;

  this.CustomEvent = CustomEvent;
    
}(this));

;(function() {

  // classList polyfill from https://gist.github.com/devongovett/1381839
  if (!('classList' in document.documentElement) && Object.defineProperty && typeof HTMLElement !== 'undefined') {
    Object.defineProperty(HTMLElement.prototype, 'classList', {
      get: function() {
        var self = this;
        function update(fn) {
          return function(value) {
            var classes = self.className.split(/\s+/),
                index = classes.indexOf(value);
            
            fn(classes, index, value);
            self.className = classes.join(" ");
          };
        };
        
        var ret = {                    
          add: update(function(classes, index, value) {
            ~index || classes.push(value);
          }),
          
          remove: update(function(classes, index) {
            ~index && classes.splice(index, 1);
          }),
          
          toggle: update(function(classes, index, value) {
            ~index ? classes.splice(index, 1) : classes.push(value);
          }),
          
          contains: function(value) {
            return !!~self.className.split(/\s+/).indexOf(value);
          },
          
          item: function(i) {
            return self.className.split(/\s+/)[i] || null;
          }
        };
        
        Object.defineProperty(ret, 'length', {
          get: function() {
            return self.className.split(/\s+/).length;
          }
        });
        
        return ret;
      }
    });
  }
  
}(this));

// requestAnimationFrame (IE9) and cancelAnimationFrame (IE9-10) polyfill
(function() {
  var lastTime = 0;
  var vendors = ['ms', 'moz', 'webkit', 'o'];
  for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
      window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
  }

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback, element) {
      var currTime = new Date().getTime(),
          timeToCall = Math.max(0, 16 - (currTime - lastTime)),
          id = window.setTimeout(function() {
            callback(currTime + timeToCall);
          }, timeToCall);

      lastTime = currTime + timeToCall;
      return id;
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
  }
}());

;(function() {
  
  var root = this;
  
  var previousDragdrop = root.Dragdrop;
  
  var dnd = function() {};
  
  root.Dragdrop = dnd;
  
  dnd.noConflict = function() {
    root.dnd = previousDragdrop;
    return this;
  };
  
  var utils = dnd.utils = {
    
    isFunction: function(obj) {
      return typeof obj === 'function';
    },

    isObject: function(obj) {
      return obj === Object(obj);
    },

    isFloating: function(item) {
      var style = root.getComputedStyle(item);
      return (/left|right/).test(style['float']) || (/inline|table-cell/).test(style['display']);
    },

    // TODO: Võibolla ei ole seda vaja siin.
    on: function(element, event, selector, handler) {
      element.addEventListener(event, function(event) {
        Array.prototype.slice.call(element.querySelectorAll(selector)).forEach(function(child) {
          if (child.contains(event.target)) {
            handler(event);
          }
        });
      });
    },

    // DOM traversal utility methods
    matches: function(el, selector) {
      return (el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector).call(el, selector);
    },

    // Find closest parent to element that matches given selector
    closest: function(el, selector) {
      if (el && el != document && dnd.utils.matches(el, selector)) {
        return el;
      } else if (el) {
        return dnd.utils.closest(el.parentNode, selector);
      } else {
        return null;
      }
    },

    closestUntil: function(el, until, selector) {
      if (el === until) {
        return until;
      } else if (dnd.utils.matches(el, selector)) {
        return el;
      } else if (el) {
        return dnd.utils.closestUntil(el.parentNode, until, selector);
      } else {
        return null;
      }
    },

    // Make sure that elements is always an array or node list that can be iterated over.
    normalize: function(elements) {
      if (typeof(elements) === 'string') {
        return document.querySelectorAll(elements);
      } else if (elements instanceof Node) {
        return [elements];
      } else if (elements instanceof NodeList) {
        return elements;
      } else if (elements instanceof Array) {
        return elements;
      } else {
        return [];
      }
    },

    overlappingPositions: function(el1, el2) {
      return dnd.utils.rectOverlappingPositions(el1.getBoundingClientRect(), el2.getBoundingClientRect());
    },
    
    rectOverlappingPositions: function(rect1, rect2) {
      return {
        top: rect1.top < rect2.top,
        right: (rect1.left + rect1.width) > (rect2.left + rect2.width),
        bottom: (rect1.top + rect1.height) > (rect2.top + rect2.height),
        left: rect1.left < rect2.left
      };
    },

    getOverlappingElement: function(el, elements) {
      var maxlapped = 0, maxlappedel, element;
  
      var x11 = parseInt(el.style.left, 10),
          y11 = parseInt(el.style.top, 10),
          x12 = x11 + el.clientWidth,
          y12 = y11 + el.clientHeight;
  
      for (var i = 0, l = elements.length; i < l; i++) {
        element = elements[i];
        
        // When element is not attached to DOM, skip the cycle as IE will raise an error when
        // getting ClientRect from such element.
        if (!element.parentNode) {
          continue;
        }
        
        var rect = element.getBoundingClientRect(),
            x21 = rect.left + window.pageXOffset,
            y21 = rect.top + window.pageYOffset,
            x22 = x21 + rect.width,
            y22 = y21 + rect.height;
    
        var x_overlap = Math.max(0, Math.min(x12, x22) - Math.max(x11, x21)),
            y_overlap = Math.max(0, Math.min(y12, y22) - Math.max(y11, y21));
        
        var overlap = x_overlap * y_overlap;
    
        if (overlap > maxlapped) {
          maxlapped = overlap;
          maxlappedel = element;
        }
      }
  
      return maxlappedel;
    },

    getClosestElement: function(el, elements) {
      // Sedasi saab kruttida et droppable juba kaugelt näeb seda draggablet
      // var d = 10;
      // x -= d; y -= d; w += (d * 2); h += (d * 2);
  
      var x1 = parseInt(el.style.left, 10),
          y1 = parseInt(el.style.top, 10),
          w1 = el.clientWidth,
          h1 = el.clientHeight;
  
      for (var i = 0, l = elements.length; i < l; i++) {
        var element = elements[i],
            rect2 = element.getBoundingClientRect(),
            x2 = rect2.left + window.pageXOffset, y2 = rect2.top + window.pageYOffset,  w2 = rect2.width, h2 = rect2.height;
    
        if (x1 + w1 < x2 || x2 + w2 < x1 || y1 + h1 < y2 || y2 + h2 < y1) {
          continue;
        } else {
          return element;
        }
      }
  
      return null;
    }
  };
  
}(this));

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

;(function() {
  
  var dnd = this.Dragdrop;
  
  dnd.Sortable = function(el, options) {
    this.el = el;
    this.el.__sortable = this;
    this.options = options;
    this.init();
  };
  
  dnd.Sortable.prototype = {
    
    init: function() {
      dnd.draggables(this.el, this.options.items, {
        distance: this.options.distance,
        grid: this.options.grid,
        helper: this.options.helper,
        handle: this.options.handle,
        payload: this.options.payload,
        droppables: this.options.droppables,
        exclude: this.options.exclude,
        tolerance: this.options.tolerance
      });
      
      dnd.utils.on(this.el, 'draggable:dragstart', this.options.items, this.handleItemDragStart.bind(this));
      dnd.utils.on(this.el, 'draggable:dragend', this.options.items, this.handleItemDragEnd.bind(this));
      
      this.el.addEventListener('draggable:dragenter', this.handleDragEnter.bind(this));
      this.el.addEventListener('draggable:dragover', this.handleDragOver.bind(this));
      this.el.addEventListener('draggable:drop', this.handleDrop.bind(this));
      this.el.addEventListener('draggable:dragleave', this.handleDragLeave.bind(this));
    },
    
    // TODO: Possible problem where draggable gets placeholder from some other sortable and brings it over to this sortable. Placeholder must be associated with current sortable.
    getPlaceholder: function(draggable) {
      if (!draggable.__sortable_placeholder) {
        var placeholder;
        
        if (dnd.utils.isFunction(this.options.placeholder)) {
          placeholder = this.options.placeholder(draggable);
        } else {
          placeholder = document.createElement('div');
          placeholder.classList.add(this.options.placeholder);
        }
        
        draggable.__sortable_placeholder = placeholder;
      }
      return draggable.__sortable_placeholder;
    },
    
    acceptsDraggable: function(draggable) {
      return dnd.utils.matches(draggable, this.options.accepts);
    },
    
    acceptsReceive: function(draggable, payload) {
      if (this.options.acceptReceive) {
        return this.options.acceptReceive(draggable, payload);
      } else {
        return true;
      }
    },
    
    acceptsAppear: function(draggable, payload) {
      if (this.options.acceptAppear) {
        return this.options.acceptAppear(draggable, payload);
      } else {
        return true;
      }
    },
    
    getSortables: function() {
      if (this.options.items) {
        return document.querySelectorAll(this.options.items);
      } else {
        return [];
      }
    },
    
    getSortableContainer: function() {
      return this.options.within ? this.el.querySelector(this.options.within) : this.el;
    },
           
    handleDragEnter: function(event) {
      if (!this.acceptsDraggable(event.detail.draggable)) {
        return;
      }
      
      this.sortableCache = this.getSortables();
    },
    
    handleDragLeave: function(event) {
      if (!this.acceptsDraggable(event.detail.draggable)) {
        return;
      }
      
      var placeholder = this.getPlaceholder(event.detail.draggable);
      
      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
      }
    },
      
    handleItemDragStart: function(event) {
      event.detail.draggable.__sortable = this.el;
    },
    
    handleDragOver: function(event) {
      if (!this.acceptsDraggable(event.detail.draggable)) {
        return;
      }
      
      event.stopPropagation();
      
      var helper = event.detail.helper;
      
      var placeholder = this.getPlaceholder(event.detail.draggable);
      
      // TODO: clean up this part here. It works very well but is not optimal
      var cache = Array.prototype.slice.call(this.sortableCache),
          items = cache.length;
      
      cache.push(placeholder);
      
      var item = dnd.utils.getOverlappingElement(helper, cache);
      
      // TODO: Clean this one up
      if (item) {
        
        var overlap = dnd.utils.overlappingPositions(helper, item);
        
        if (dnd.utils.isFloating(item)) {
          if (event.detail.deltaX < 0) {
            item.parentNode.insertBefore(placeholder, item.nextSibling);
          } else if (event.detail.deltaX > 0) {
            item.parentNode.insertBefore(placeholder, item);
          }
        } else {
          if (overlap.bottom == overlap.top) {
            if (event.detail.deltaY < 0) {
              item.parentNode.insertBefore(placeholder, item.nextSibling);
            } else if (event.detail.deltaY > 0) {
              item.parentNode.insertBefore(placeholder, item);
            }
          } else if (overlap.bottom) {
            item.parentNode.insertBefore(placeholder, item.nextSibling);
          } else {
            item.parentNode.insertBefore(placeholder, item);
          }
        }
      } else {
        if (items > 0) {
          this.el.appendChild(placeholder);
        }
      }
    },
      
    handleItemDragEnd: function(event) {
      event.stopPropagation();
      
      delete(event.detail.draggable.__sortable);
    },
    
    handleDrop: function(event) {
      if (!this.acceptsDraggable(event.detail.draggable)) {
        return;
      }
      
      var placeholder = this.getPlaceholder(event.detail.draggable);
      
      if (this.el.contains(event.detail.draggable) || (dnd.utils.matches(event.detail.draggable, this.options.items) && this.acceptsReceive(event.detail.payload, event.detail.payload))) {
        this.handleSort(event);
      } else if (this.acceptsAppear(event.detail.draggable, event.detail.payload)) {
        this.handleAppear(event);
      }
    },
    
    handleSort: function(event) {
      var placeholder = this.getPlaceholder(event.detail.draggable),
          prevSortable = event.detail.draggable.__sortable;
      
      if (placeholder.parentNode) {
        placeholder.parentNode.insertBefore(event.detail.draggable, placeholder);
        placeholder.parentNode.removeChild(placeholder);
      }
      
      if (prevSortable && prevSortable != this.el) {
        prevSortable.dispatchEvent(new CustomEvent('sortable:remove', {detail: {
          draggable: event.detail.draggable, payload: event.detail.payload
        }}));
        
        this.el.dispatchEvent(new CustomEvent('sortable:receive', {detail: {
          draggable: event.detail.draggable, payload: event.detail.payload
        }}));
      }
      
      this.el.dispatchEvent(new CustomEvent('sortable:sort', {detail: {
        draggable: event.detail.draggable, payload: event.detail.payload
      }}));
    },
    
    handleAppear: function(event) {
      var placeholder = this.getPlaceholder(event.detail.draggable);
      
      var appearedElement = this.options.appear(event.detail.draggable, event.detail.payload);
      
      if (placeholder.parentNode) {
        placeholder.parentNode.insertBefore(appearedElement, placeholder);
        placeholder.parentNode.removeChild(placeholder);
      } else {
        this.getSortableContainer().appendChild(appearedElement);
      }
      
      this.el.dispatchEvent(new CustomEvent('sortable:appear', {detail: {
        appearedElement: appearedElement, draggable: event.detail.draggable, payload: event.detail.payload
      }}));
      
      event.detail.draggable.dispatchEvent(new CustomEvent('draggable:appear', {bubbles: true, detail: {sortable: this.el}}));
    }
  };
  
  // Convenience method to initialize sortable element. This should be called by dragdrop client when making given
  // element sortable.
  dnd.sortable = function(elements, options) {
    Array.prototype.slice.call(dnd.utils.normalize(elements)).forEach(function(element) {
      if (!element.__sortable) {
        new dnd.Sortable(element, options);
      }
    });
  };

}(this));

;(function() {

  // Global element, could be a window, could be something else we export to.
  var root = this;
  
  var dnd = this.Dragdrop;
  
  // TODO: Improve touch support
  dnd.Resizable = function(el, options) {
    this.el = el;
    this.el.__resizable = this;
  
    this.handleViewportResize = this.handleViewportResize.bind(this);
  
    // Default options
    this.options = {
      handles: 'e,s,se',
      aspectRatio: false,
      constraints: this.getConstraints.bind(this),
      validateDimensions: this.validateDimensions.bind(this),
      updateDimensions: this.updateDimensions.bind(this)
    };
  
    for (var attrib in options) {
      this.options[attrib] = options[attrib];
    }
    
    // Drag handlers array
    this.handlers = [];
  };

  dnd.Resizable.prototype = {
  
    // Build resize handler elements around resizable element at desired corners and edges. Also
    // initializes draggables on these elements.
    buildHandlers: function() {
      this.handlers.push(this.buildHandler('right', 'center', 'e'));
      this.handlers.push(this.buildHandler('right', 'bottom', 'se'));
      this.handlers.push(this.buildHandler('center', 'bottom', 's'));
      this.handlers.push(this.buildHandler('left', 'bottom', 'sw'));
      this.handlers.push(this.buildHandler('left', 'center', 'w'));

      dnd.draggable(this.handlers, {
        autoScroll: false, grid: this.options.grid, gridOrigin: this.getOffsetForResize.bind(this)
      });
    },
  
    // Build resize handler DOM node and add event listeners to them. Nodes will not be appended
    // to DOM.
    buildHandler: function(positionX, positionY, coordinate) {
      var handler = document.createElement('div');
      handler._resizablePositionX = positionX;
      handler._resizablePositionY = positionY;
      handler._resizableCoordinate = coordinate;
    
      handler.classList.add(this.options.handler);
    
      handler.style.webkitTransform = 'translate3d(0,0,0)';
    
      handler.addEventListener('draggable:dragstart', this.handleDragStart.bind(this));
      handler.addEventListener('draggable:drag', this.handleDrag.bind(this));
      handler.addEventListener('draggable:dragend', this.handleDragEnd.bind(this));
      handler.addEventListener('click', this.handleHandlerClick.bind(this));
    
      return handler;
    },
  
    // Set positions for resize handlers based on their corner/edge location. Calculates positions
    // based on resizable element bounding rectangle.
    positionHandlers: function() {
      var rect = this.el.getBoundingClientRect();
    
      this.handlers.forEach(function(handler) {
        if (handler._resizablePositionX == 'left') {
          handler.style.left = (rect.left + window.pageXOffset) + 'px';
        } else if (handler._resizablePositionX == 'center') {
          handler.style.left = (rect.left + (rect.width / 2) + window.pageXOffset) + 'px';
        } else if (handler._resizablePositionX == 'right') {
          handler.style.left = (rect.left + rect.width + window.pageXOffset) + 'px';
        }
      
        if (handler._resizablePositionY == 'center') {
          handler.style.top = (rect.top + (rect.height / 2) + window.pageYOffset) + 'px';
        } else if (handler._resizablePositionY == 'bottom') {
          handler.style.top = (rect.top + rect.height + window.pageYOffset) + 'px';
        }
      });
    },
    
    // Show resize handlers. If they are not present, they will be created for the first time and
    // cached for later usage. Handlers will be appended to DOM and removed from DOM with hide()
    // function. Only the handles with coordinates set in this.options.handles will be shown.
    // Also start listening on root element for viewport resize changes.
    show: function() {
      if (this.handlers.length == 0) {
        this.buildHandlers();
      }
      
      var handles = this.options.handles.split(',').map(function(i) { return i.trim(); });
      
      this.handlers.forEach(function(handler) {
        if (!handler.parentNode && handles.indexOf(handler._resizableCoordinate) !== -1) {
          document.body.appendChild(handler);
        } else if (handler.parentNode && handles.indexOf(handler._resizableCoordinate) === -1) {
          document.body.removeChild(handler);
        }
      });
      
      this.positionHandlers();
      
      root.addEventListener('resize', this.handleViewportResize);
    },
    
    // Hide resize handlers by removing them from DOM.
    hide: function() {
      root.removeEventListener('resize', this.handleViewportResize);
      
      this.handlers.forEach(function(handler) {
        if (handler.parentNode) {
          document.body.removeChild(handler);
        }
      });
    },
    
    // Update handlers set by giving the handles string with new coordinates. It is advised to do
    // this when resize is not currently active, i.e. when resize may alter the coordinates, do 
    // it after getting resizable:resize or resizable:resizeend event.
    setHandles: function(handles) {
      this.options.handles = handles;
      this.show();
    },
    
    // Remove resize handlers from DOM by calling hide() and remove association between element
    // and this resizable instance.
    destroy: function() {
      this.hide();
      
      this.el.__resizable = null;
    },
  
    // Callback to ask client for size constraints this resizable may have. This method will be
    // called during the resize start for once.
    getConstraints: function() {
      return {};
    },
  
    // Callback to check whether new dimensions are allowed. Provides dimensions object with width
    // and height and expects boolean value to be returned. When function returns false, resize
    // will not be performed. This method can be overriden by resizable client in options.
    validateDimensions: function(dimensions) {
      return true;
    },
    
    // Update resizable element dimensions. Dimensions object with width and height will be
    // provided as an argument. This method can be overriden by resizable client in options.
    // Default implementation of this method will just update style width and height values on
    // resizable element.
    updateDimensions: function(dimensions) {
      this.el.style.width = dimensions.width + 'px';
      this.el.style.height = dimensions.height + 'px';
    },
    
    // Given new element dimensions, check whether they are valid and call updateDimensions that
    // applies these dimensions to element. Fires resizable:resize event upon successful resize.
    performElementResize: function(dimensions) {
      if (!this.options.validateDimensions(dimensions)) {
        return;
      }
      
      this.options.updateDimensions(dimensions);
      
      this.el.dispatchEvent(new CustomEvent('resizable:resize', {bubbles: true}));
    
      // Update handler positions to match element dimensions
      this.positionHandlers();
    },
    
    getOffsetForResize: function() {
      var rect = this.el.getBoundingClientRect();
      
      return [rect.top + window.pageYOffset, rect.left + window.pageXOffset];
    },
    
    // Notify resize element that resize has been initiated but size has not yet changed.
    handleDragStart: function() {
      this.el.dispatchEvent(new CustomEvent('resizable:resizestart', {bubbles: true}));
      
      var rect = this.el.getBoundingClientRect();
      
      this.initialSize = {width: rect.width, height: rect.height};
      this.aspectRatio = rect.height / rect.width;
      this.constraints = this.options.constraints();
    },
  
    // Handle drag events on resize handler DOM elements. It calculates new possible size for
    // resizable elements and uses validateDimensions and updateDimensions methods to perform
    // actual resize on element.
    //
    // TODO: Refactor the constraints calculation. We have some duplicated code in here.
    handleDrag: function(event) {
      var rect = this.el.getBoundingClientRect();
    
      var handler = event.detail.draggable,
          deltaX = parseInt(handler.style.left, 10) - event.detail.pageX,
          deltaY = parseInt(handler.style.top, 10) - event.detail.pageY;
    
      var dimensions = {
        initialWidth: this.initialSize.width, initialHeight: this.initialSize.height,
        previousWidth: rect.width, previousHeight: rect.height,
        width: rect.width, height: rect.height
      };
      
      window.requestAnimationFrame((function() {
        if (handler._resizablePositionX == 'right' && handler._resizablePositionY == 'center') {
          dimensions.width = rect.width - deltaX;
        }
        
        if (handler._resizablePositionX == 'left' && handler._resizablePositionY == 'center') {
          dimensions.width = rect.width + deltaX;
        }
        
        if (this.constraints.maxWidth) {
          dimensions.width = Math.min(dimensions.width, this.constraints.maxWidth);
        }
    
        if (handler._resizablePositionX == 'right' && handler._resizablePositionY == 'bottom') {
          dimensions.width = rect.width - deltaX;
          
          if (this.constraints.maxWidth) {
            dimensions.width = Math.min(dimensions.width, this.constraints.maxWidth);
          }
          
          if (this.options.aspectRatio) {
            dimensions.height = dimensions.width * this.aspectRatio;
          } else {
            dimensions.height = rect.height - deltaY;
          }
        }
        
        if (handler._resizablePositionX == 'left' && handler._resizablePositionY == 'bottom') {
          dimensions.width = rect.width + deltaX;
          
          if (this.constraints.maxWidth) {
            dimensions.width = Math.min(dimensions.width, this.constraints.maxWidth);
          }
          
          if (this.options.aspectRatio) {
            dimensions.height = dimensions.width * this.aspectRatio;
          } else {
            dimensions.height = rect.height - deltaY;
          }
        }
    
        if (handler._resizablePositionX == 'center' && handler._resizablePositionY == 'bottom') {
          dimensions.height = rect.height - deltaY;
        }
        
        if (this.constraints.maxHeight) {
          dimensions.height = Math.min(dimensions.height, this.constraints.maxHeight);
        }
      
        this.performElementResize(dimensions);
      }).bind(this));
    },
    
    // Notify resizable element that resizing has been stopped and no further resize actions will
    // not be performed this time.
    handleDragEnd: function() {
      this.el.dispatchEvent(new CustomEvent('resizable:resizeend', {bubbles: true}));
    },
    
    // Prevent default event on resize handler element. This can be used to check elsewhere if
    // click event did occur on resizable handler element.
    handleHandlerClick: function(event) {
      event.preventDefault();
    },
    
    // Listen for viewport size changes in order to position resize handlers correctly around
    // resizable element.
    handleViewportResize: function() {
      this.positionHandlers();
    }
  };
  
  dnd.resizable = function(elements, options) {
    Array.prototype.slice.call(dnd.utils.normalize(elements)).forEach(function(element) {
      if (!element.__resizable) {
        new dnd.Resizable(element, options);
      }
    });
  };
  
}(this));
