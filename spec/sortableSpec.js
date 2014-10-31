describe('sortable()', function() {
  
  beforeEach(function() {
    loadFixtures('sortables.html');
  });
  
  describe('when created from node', function() {
    beforeEach(function() {
      Dragdrop.sortable(document.querySelector('.sortable'), {
        items: '.sortable-item'
      });
    });
    
    it('makes node sortable', function() {
      expect($('.sortable').get(0).__sortable).toBeDefined();
    });
    
    describe('with sortable items', function() {
      beforeEach(function() {
        $('.sortable .sortable-item').each(function(_, item) {
          item.dispatchEvent(new CustomEvent('mouseover', {bubbles: true}));
        });
      });
      
      it('has sortable items', function() {
        expect($('.sortable .sortable-item').length).toEqual(3);
      });
      
      it('makes sortable items draggable', function() {
        $('.sortable .sortable-item').each(function(_, item) {
          expect(item.__draggable).toBeDefined();
        });
      });
    });
    
    describe('with non-sortable items', function() {
      beforeEach(function() {
        $('.sortable .non-sortable-item').each(function(_, item) {
          item.dispatchEvent(new CustomEvent('mouseover', {bubbles: true}));
        });
      });
      
      it('has non-sortable items', function() {
        expect($('.sortable .non-sortable-item').length).toEqual(1);
      });
      
      it('does not make non-sortable items draggable', function() {
        $('.sortable .non-sortable-item').each(function(_, item) {
          expect(item.__draggable).not.toBeDefined();
        });
      });
    });
  });
  
  it('triggers "sortable:removed" event on sortable when moved out from current sortable');
  
  describe('draggable:dragover event', function() {
    describe('when drag over sortable container', function() {
      
    });
    
    describe('when drag over sortable element', function() {
      
    });
    
    describe('when drag over non-sortable element', function() {
      
    });
    
    describe('when drag over placeholder', function() {
      
    });
  });
});
