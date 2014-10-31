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
