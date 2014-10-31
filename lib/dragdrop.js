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
