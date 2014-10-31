describe('draggable()', function() {
  
  beforeEach(function() {
    loadFixtures('draggables.html');
  });
  
  describe('when created from nodelist', function() {
    it('creates draggable for each element in list', function() {
      Dragdrop.draggable(document.querySelectorAll('.draggable'), {});
      
      $('.draggable').each(function(idx, item) {
        expect(item.__draggable).toBeDefined();
      });
    });
  });
  
  describe('when created by string selector', function() {
    it('creates draggables from elements found by selector', function() {
      Dragdrop.draggable('.draggable', {});
      
      $('.draggable').each(function(idx, item) {
        expect(item.__draggable).toBeDefined();
      });
    });
  });
  
  describe('when created from single element', function() {
    it('creates draggable from given element', function() {
      Dragdrop.draggable(document.querySelector('.draggable'), {});
      
      expect($('.draggable:first').get(0).__draggable).toBeDefined();
    });
  });
});

describe('draggables()', function() {
  
  beforeEach(function() {
    loadFixtures('draggables.html');
  });
  
  it('does not initialize draggable elements immediately', function() {
    Dragdrop.draggables('.draggables-container', '.draggable-lazy', {});
    
    $('.draggables-container .draggable-lazy').each(function(_, item) {
      expect(item.__draggable).not.toBeDefined();
    });
  });
  
  describe('when mouseover event happens on one draggable', function() {
    beforeEach(function() {
      Dragdrop.draggables('.draggables-container', '.draggable-lazy', {});
      
      var el = $('.draggables-container .draggable-lazy:first').get(0);
      
      el.dispatchEvent(new CustomEvent('mouseover', {bubbles: true}));
    });
    
    it('initializes draggable', function() {
      expect($('.draggables-container .draggable-lazy:first').get(0).__draggable).toBeDefined();
    });
    
    it('does not initialize other draggables', function() {
      expect($('.draggables-container .draggable-lazy:nth-child(2)').get(0).__draggable).not.toBeDefined();
    });
  });
});
