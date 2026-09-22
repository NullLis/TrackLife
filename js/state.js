window.WorldState = {
  currentYear: 7,

  currentTab: 'map',

  tabsCollapsed: false,

  /*
   * 当前选中的世界实体。
   *
   * {
   *   type: 'location' | 'faction' | 'character' | 'event',
   *   id: 'm1'
   * }
   */
  selectedEntity: null,

  /*
   * 兼容旧代码。
   * 真正的选择状态以 selectedEntity 为准。
   */
  selectedLocationId: null,

  detailSubTab: 'overview',

  resourceFilter: 'active',

  map: {
    x: 0,
    y: 0,
    scale: 1,
    minScale: 0.35,
    maxScale: 3
  },

  listeners: [],

  setYear(year) {
    const nextYear = Math.max(
      1,
      Math.min(7, Number(year) || 1)
    );

    if (this.currentYear === nextYear) {
      return;
    }

    this.currentYear = nextYear;

    this.emit('year');
  },

  select(type, id, subTab = 'overview') {
    if (!type || !id) {
      return;
    }

    this.selectedEntity = {
      type,
      id
    };

    this.selectedLocationId =
      type === 'location'
        ? id
        : null;

    this.detailSubTab = subTab;

    this.emit('selection');
  },

  clearSelection() {
    this.selectedEntity = null;

    this.selectedLocationId = null;

    this.detailSubTab = 'overview';

    this.emit('selectionClear');
  },

  isSelected(type, id) {
    const selected =
      this.selectedEntity;

    return !!(
      selected &&
      selected.type === type &&
      selected.id === id
    );
  },

  on(listener) {
    if (typeof listener !== 'function') {
      return;
    }

    this.listeners.push(listener);

    /*
     * 返回取消监听函数。
     */
    return () => {
      const index =
        this.listeners.indexOf(listener);

      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  },

  emit(reason) {
    const listeners = [
      ...this.listeners
    ];

    listeners.forEach(listener => {
      try {
        listener(reason, this);
      } catch (error) {
        console.error(
          '[WorldState]',
          error
        );
      }
    });
  }
};
