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
