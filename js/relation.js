window.RelationUI = (() => {

  const NS = WorldUtils.svgNS;

  function active(item) {
    return WorldMap.isActive(item, WorldState.currentYear);
  }

  function isFuture(item) {
    return WorldMap.isFuture(item, WorldState.currentYear);
  }

  function isEnded(item) {
    return WorldMap.isEnded(item, WorldState.currentYear);
  }

  /**
   * 创建 SVG 元素
   */
  function svg(tag, attrs = {}) {
    const el = document.createElementNS(NS, tag);

    Object.entries(attrs).forEach(([key, value]) => {
      el.setAttribute(key, value);
    });

    return el;
  }

  /**
   * 清除所有关系图节点选中状态
   */
  function clearSelectedNodes() {
    document.querySelectorAll('.rel-node.selected').forEach(node => {
      node.classList.remove('selected');
    });
  }

  /**
   * 设置节点选中状态
   */
  function selectNode(nodeId) {
    clearSelectedNodes();

    document
      .querySelectorAll(`.rel-node[data-id="${nodeId}"]`)
      .forEach(node => {
        node.classList.add('selected');
      });
  }

  /**
   * 打开右侧详情
   *
   * 这里不只依赖 WorldState 的监听器，
   * 而是在点击节点后主动刷新一次 Sidebar。
   *
   * 这样可以保证：
   * 点击人物 / 势力
   * → 设置状态
   * → 右侧面板展开
   * → 立即显示详情
   */
  function openDetail(type, id) {

    WorldState.select(type, id, 'overview');

    // 主动刷新右侧详情
    if (window.SidebarUI) {

      if (typeof SidebarUI.open === 'function') {
        SidebarUI.open();
      }

      if (typeof SidebarUI.renderSelected === 'function') {
        SidebarUI.renderSelected();
      }
    }
  }

  /**
   * 创建一个完整的关系节点
   *
   * 点击范围不只覆盖小圆点，
   * 还包括：
   * - 圆点
   * - 名称
   * - 身份
   *
   * 这样用户点击人物名字也能打开详情。
   */
  function createNode({
    node,
    type
  }) {

    const future = isFuture(node);
    const ended = isEnded(node);

    const g = svg('g');

    g.classList.add('rel-node');

    if (future) {
      g.classList.add('future');
    }

    if (ended) {
      g.classList.add('rel-node-ended');
    }

    g.dataset.id = node.id;
    g.dataset.entityType = type;

    g.style.color = node.color || '#d4a76a';

    /**
     * ------------------------------------------------------
     * 点击区域
     * ------------------------------------------------------
     *
     * 这是解决“点不到”的关键。
     *
     * 使用透明矩形覆盖：
     * - 圆点
     * - 名称
     * - 身份
     *
     * 用户点击整个节点区域都可以触发。
     */
    const hit = svg('rect', {
      x: node.x - 34,
      y: node.y - 8,
      width: 68,
      height: 58,
      rx: 10,
      fill: '#ffffff',
      'fill-opacity': '0.001',
      'pointer-events': 'all'
    });

    hit.classList.add('rel-hit');

    /**
     * 光晕
     */
    const halo = svg('circle', {
      cx: node.x,
      cy: node.y,
      r: 17,
      fill: node.color || '#d4a76a',
      opacity: 0.12
    });

    halo.classList.add('rel-halo');

    /**
     * 外圈
     */
    const ring = svg('circle', {
      cx: node.x,
      cy: node.y,
      r: 11,
      fill: 'none',
      stroke: node.color || '#d4a76a',
      'stroke-width': 1,
      opacity: 0.35
    });

    ring.classList.add('rel-ring');

    /**
     * 主圆点
     */
    const dot = svg('circle', {
      cx: node.x,
      cy: node.y,
      r: 8,
      fill: node.color || '#d4a76a',
      stroke: '#0e1116',
      'stroke-width': 2
    });

    dot.classList.add('dot');
    dot.classList.add('rel-core');

    /**
     * 当前状态小圆点
     */
    const stateDot = svg('circle', {
      cx: node.x + 9,
      cy: node.y - 9,
      r: 3,
      fill: active(node)
        ? (node.color || '#d4a76a')
        : '#596574'
    });

    stateDot.classList.add('rel-state-dot');

    /**
     * 名称背景
     *
     * 增加一个真正可见的背景，
     * 防止名称与关系线重叠时不好辨认。
     */
    const labelBg = svg('rect', {
      x: node.x - 34,
      y: node.y + 17,
      width: 68,
      height: 27,
      rx: 6,
      fill: '#111821',
      'fill-opacity': 0.82,
      stroke: node.color || '#d4a76a',
      'stroke-opacity': 0.22,
      'stroke-width': 1
    });

    labelBg.classList.add('rel-label-bg');

    /**
     * 名称
     */
    const name = svg('text', {
      x: node.x,
      y: node.y + 28
    });

    name.classList.add('rel-name');
    name.textContent = node.name;

    /**
     * 身份 / 角色
     */
    const role = svg('text', {
      x: node.x,
      y: node.y + 40
    });

    role.classList.add('rel-role');

    if (active(node)) {
      role.textContent = node.role || '';
    } else if (future) {
      role.textContent = '尚未登场';
    } else if (ended) {
      role.textContent = '已离场';
    } else {
      role.textContent = node.role || '';
    }

    /**
     * 按照显示层级添加
     *
     * hit 最后添加，
     * 保证点击区域位于最上层。
     */
    g.appendChild(halo);
    g.appendChild(ring);
    g.appendChild(dot);
    g.appendChild(stateDot);
    g.appendChild(labelBg);
    g.appendChild(name);
    g.appendChild(role);
    g.appendChild(hit);

    /**
     * ------------------------------------------------------
     * 点击事件
     * ------------------------------------------------------
     */
    g.addEventListener('click', event => {

      event.preventDefault();
      event.stopPropagation();

      /**
       * 未来节点
       */
      if (future) {

        if (typeof showToast === 'function') {
          showToast(
            `“${node.name}”将在天启${WorldUtils.toCN(node.startYear)}年${type === 'character' ? '登场' : '开放'}`
          );
        }

        return;
      }

      /**
       * 已结束节点依然可以查看详情。
       *
       * 所以这里不能直接 return。
       */

      selectNode(node.id);

      /**
       * 打开右侧详情
       */
      openDetail(type, node.id);
    });

    /**
     * 鼠标按下时也阻止 SVG 背景点击
     */
    g.addEventListener('pointerdown', event => {
      event.stopPropagation();
    });

    return g;
  }

  /**
   * 创建关系连线
   */
  function createEdge(edge, nodeMap) {

    const from = nodeMap[edge.from];
    const to = nodeMap[edge.to];

    if (!from || !to) {
      return null;
    }

    const dx = to.x - from.x;
    const dy = to.y - from.y;

    const length = Math.hypot(dx, dy) || 1;

    const ux = dx / length;
    const uy = dy / length;

    const startOffset = 18;
    const endOffset = 18;

    const x1 = from.x + ux * startOffset;
    const y1 = from.y + uy * startOffset;

    const x2 = to.x - ux * endOffset;
    const y2 = to.y - uy * endOffset;

    const line = svg('line', {
      x1,
      y1,
      x2,
      y2,
      stroke: edge.color || '#4a5665',
      'stroke-width': 1.6
    });

    line.classList.add('rel-edge');

    if (WorldState.currentYear < edge.startYear) {
      line.classList.add('future');
    }

    if (
      edge.endYear &&
      WorldState.currentYear > edge.endYear
    ) {
      line.classList.add('rel-edge-ended');
    }

    if (edge.dashed) {
      line.setAttribute('stroke-dasharray', '4 3');
    }

    /**
     * 关系文字
     */
    const label = svg('text', {
      x: (x1 + x2) / 2,
      y: (y1 + y2) / 2 - 3
    });

    label.classList.add('rel-edge-label');
    label.textContent = edge.label || '';

    const fragment = document.createDocumentFragment();

    fragment.appendChild(line);
    fragment.appendChild(label);

    return fragment;
  }

  /**
   * 绘制整个关系图
   */
  function renderGraph(
    edgesId,
    nodesId,
    nodes,
    edges,
    type
  ) {

    const edgesBox = document.getElementById(edgesId);
    const nodesBox = document.getElementById(nodesId);

    if (!edgesBox || !nodesBox) {
      return;
    }

    edgesBox.innerHTML = '';
    nodesBox.innerHTML = '';

    const nodeMap = Object.fromEntries(
      nodes.map(node => [node.id, node])
    );

    /**
     * ------------------------------------------------------
     * 绘制关系线
     * ------------------------------------------------------
     */
    edges.forEach(edge => {

      const fragment = createEdge(
        edge,
        nodeMap
      );

      if (fragment) {
        edgesBox.appendChild(fragment);
      }

    });

    /**
     * ------------------------------------------------------
     * 绘制节点
     * ------------------------------------------------------
     */
    nodes.forEach(node => {

      const nodeElement = createNode({
        node,
        type
      });

      nodesBox.appendChild(nodeElement);

    });
  }

  /**
   * 更新当前选中状态
   *
   * 时间轴变化或者重新渲染之后，
   * 根据 WorldState.selectedEntity 恢复选中节点。
   */
  function syncSelectionVisuals() {

    clearSelectedNodes();

    const selected = WorldState.selectedEntity;

    if (!selected) {
      return;
    }

    document
      .querySelectorAll(
        `.rel-node[data-id="${selected.id}"]`
      )
      .forEach(node => {
        node.classList.add('selected');
      });
  }

  /**
   * 更新页面顶部说明
   */
  function updateDescriptions() {

    const y = WorldState.currentYear;

    const activeFactions =
      window.WorldData.factions.filter(
        item => WorldMap.isActive(item, y)
      ).length;

    const activeCharacters =
      window.WorldData.characters.filter(
        item => WorldMap.isActive(item, y)
      ).length;

    const activeFactionRelations =
      window.WorldData.factionRelations.filter(
        item => WorldMap.isActive(item, y)
      ).length;

    const activeCharacterRelations =
      window.WorldData.characterRelations.filter(
        item => WorldMap.isActive(item, y)
      ).length;

    const factionDesc =
      document.getElementById('factionPageDesc');

    const relationDesc =
      document.getElementById('relationPageDesc');

    if (factionDesc) {

      factionDesc.textContent =
        `天启${WorldUtils.toCN(y)}年 · ` +
        `${activeFactions}/${window.WorldData.factions.length} ` +
        `个势力参与世界状态 · ` +
        `${activeFactionRelations}/${window.WorldData.factionRelations.length} ` +
        `条关系生效`;
    }

    if (relationDesc) {

      relationDesc.textContent =
        `天启${WorldUtils.toCN(y)}年 · ` +
        `${activeCharacters}/${window.WorldData.characters.length} ` +
        `位人物在场 · ` +
        `${activeCharacterRelations}/${window.WorldData.characterRelations.length} ` +
        `条关系生效`;
    }
  }

  /**
   * 全部重新绘制
   */
  function renderAll() {

    renderGraph(
      'factionEdges',
      'factionNodes',
      window.WorldData.factions,
      window.WorldData.factionRelations,
      'faction'
    );

    renderGraph(
      'relationEdges',
      'relationNodes',
      window.WorldData.characters,
      window.WorldData.characterRelations,
      'character'
    );

    updateDescriptions();

    syncSelectionVisuals();
  }

  /**
   * 初始化
   */
  function init() {

    renderAll();

    WorldState.on(reason => {

      /**
       * 时间轴变化：
       * 重新绘制节点状态
       */
      if (reason === 'year') {
        renderAll();
        return;
      }

      /**
       * 切换选择：
       * 只更新选中视觉状态
       */
      if (reason === 'selection') {
        syncSelectionVisuals();
        return;
      }

      /**
       * 清除选择
       */
      if (reason === 'selectionClear') {
        clearSelectedNodes();
        return;
      }

    });

    /**
     * 窗口变化时重新检查布局
     */
    window.addEventListener('resize', () => {
      syncSelectionVisuals();
    });
  }

  return {
    init,
    renderAll,
    syncSelectionVisuals
  };

})();
