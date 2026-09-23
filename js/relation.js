window.RelationUI = (() => {

  const NS = WorldUtils.svgNS;

  const MIN_ZOOM = 0.45;
  const MAX_ZOOM = 4.0;
  const INITIAL_ZOOM = 1.0;

  const graphStates = {
    faction: {
      scale: INITIAL_ZOOM,
      x: 0,
      y: 0,
      initialized: false
    },

    character: {
      scale: INITIAL_ZOOM,
      x: 0,
      y: 0,
      initialized: false
    }
  };

  const dragStates = {
    faction: {
      active: false,
      moved: false,
      pointerId: null,
      startClientX: 0,
      startClientY: 0,
      startX: 0,
      startY: 0
    },

    character: {
      active: false,
      moved: false,
      pointerId: null,
      startClientX: 0,
      startClientY: 0,
      startX: 0,
      startY: 0
    }
  };

  let suppressClickUntil = 0;

  /* =========================================================
     基础
     ========================================================= */

  function getSvg(type) {
    return document.querySelector(
      type === 'faction'
        ? '#iv-faction .graph-large-svg'
        : '#iv-relation .graph-large-svg'
    );
  }

  function getState(type) {
    return graphStates[type];
  }

  function getDragState(type) {
    return dragStates[type];
  }

  function getViewBox(svg) {

    if (!svg) {
      return {
        x: 0,
        y: 0,
        width: 300,
        height: 240
      };
    }

    const vb = svg.viewBox?.baseVal;

    if (
      vb &&
      vb.width > 0 &&
      vb.height > 0
    ) {
      return {
        x: vb.x,
        y: vb.y,
        width: vb.width,
        height: vb.height
      };
    }

    const value =
      svg.getAttribute('viewBox');

    if (value) {

      const values =
        value
          .trim()
          .split(/[\s,]+/)
          .map(Number);

      if (
        values.length === 4 &&
        values.every(Number.isFinite) &&
        values[2] > 0 &&
        values[3] > 0
      ) {
        return {
          x: values[0],
          y: values[1],
          width: values[2],
          height: values[3]
        };
      }
    }

    return {
      x: 0,
      y: 0,
      width: 300,
      height: 240
    };
  }

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }

  /* =========================================================
     SVG 坐标转换
     ========================================================= */

  function clientToSvg(
    svg,
    clientX,
    clientY
  ) {

    if (!svg) {
      return {
        x: 0,
        y: 0
      };
    }

    const matrix =
      svg.getScreenCTM();

    if (matrix) {

      const point =
        svg.createSVGPoint();

      point.x = clientX;
      point.y = clientY;

      const result =
        point.matrixTransform(
          matrix.inverse()
        );

      return {
        x: result.x,
        y: result.y
      };
    }

    const rect =
      svg.getBoundingClientRect();

    const vb =
      getViewBox(svg);

    return {
      x:
        vb.x +
        ((clientX - rect.left) /
          Math.max(rect.width, 1)) *
        vb.width,

      y:
        vb.y +
        ((clientY - rect.top) /
          Math.max(rect.height, 1)) *
        vb.height
    };
  }

  /* =========================================================
     平移边界
     ========================================================= */

  function clampPosition(type) {

    const svg =
      getSvg(type);

    if (!svg) {
      return;
    }

    const state =
      getState(type);

    const vb =
      getViewBox(svg);

    const scaledWidth =
      vb.width * state.scale;

    const scaledHeight =
      vb.height * state.scale;

    /*
     * 无论缩放到多小，都保留可拖动空间。
     *
     * 原逻辑在内容小于视口时会强制居中：
     *
     *   state.x = (vb.width - scaledWidth) / 2
     *
     * 这样一来 scale < 1 时，用户拖动后坐标
     * 又会立刻被强制改回居中位置。
     *
     * 这里给 X/Y 都增加额外拖动缓冲区：
     * 既保证任何缩放比例都能拖动，
     * 又避免图形被无限拖出可视区域。
     */
    const extraX =
      vb.width * 0.35;

    const extraY =
      vb.height * 0.35;

    /*
     * X
     */
    let minX;
    let maxX;

    if (
      scaledWidth >= vb.width
    ) {

      minX =
        vb.width -
        scaledWidth -
        extraX;

      maxX =
        extraX;

    } else {

      minX =
        -extraX;

      maxX =
        vb.width -
        scaledWidth +
        extraX;
    }

    state.x =
      clamp(
        state.x,
        minX,
        maxX
      );

    /*
     * Y
     */
    let minY;
    let maxY;

    if (
      scaledHeight >= vb.height
    ) {

      minY =
        vb.height -
        scaledHeight -
        extraY;

      maxY =
        extraY;

    } else {

      minY =
        -extraY;

      maxY =
        vb.height -
        scaledHeight +
        extraY;
    }

    state.y =
      clamp(
        state.y,
        minY,
        maxY
      );
  }

  /* =========================================================
     应用变换
     ========================================================= */

  function applyTransform(type) {

    const state =
      getState(type);

    const prefix =
      type === 'faction'
        ? 'faction'
        : 'relation';

    const edges =
      document.getElementById(
        `${prefix}Edges`
      );

    const nodes =
      document.getElementById(
        `${prefix}Nodes`
      );

    if (!edges || !nodes) {
      return;
    }

    const transform =
      `translate(${state.x} ${state.y}) scale(${state.scale})`;

    edges.setAttribute(
      'transform',
      transform
    );

    nodes.setAttribute(
      'transform',
      transform
    );
  }

  /* =========================================================
     初始化视图
     ========================================================= */

  function fitGraph(type) {

    const svg =
      getSvg(type);

    if (!svg) {
      return;
    }

    const state =
      getState(type);

    const vb =
      getViewBox(svg);

    state.scale =
      INITIAL_ZOOM;

    state.x =
      (vb.width -
        vb.width * state.scale) /
      2;

    state.y =
      (vb.height -
        vb.height * state.scale) /
      2;

    clampPosition(type);

    state.initialized = true;

    applyTransform(type);
  }

  /* =========================================================
     重置
     ========================================================= */

  function reset(type) {
    fitGraph(type);
  }

  /* =========================================================
     缩放
     ========================================================= */

  function zoomAtPoint(
    type,
    factor,
    clientX,
    clientY
  ) {

    const svg =
      getSvg(type);

    if (!svg) {
      return;
    }

    const state =
      getState(type);

    const oldScale =
      state.scale;

    const newScale =
      clamp(
        oldScale * factor,
        MIN_ZOOM,
        MAX_ZOOM
      );

    if (
      Math.abs(
        newScale - oldScale
      ) < 0.00001
    ) {
      return;
    }

    /*
     * 当前鼠标对应 SVG 坐标
     */
    const mouse =
      clientToSvg(
        svg,
        clientX,
        clientY
      );

    /*
     * 找出缩放前内容坐标
     */
    const contentX =
      (mouse.x - state.x) /
      oldScale;

    const contentY =
      (mouse.y - state.y) /
      oldScale;

    state.scale =
      newScale;

    /*
     * 保证鼠标所指位置保持不跳动
     */
    state.x =
      mouse.x -
      contentX * newScale;

    state.y =
      mouse.y -
      contentY * newScale;

    clampPosition(type);

    applyTransform(type);
  }

  function zoomCenter(
    type,
    factor
  ) {

    const svg =
      getSvg(type);

    if (!svg) {
      return;
    }

    const rect =
      svg.getBoundingClientRect();

    zoomAtPoint(
      type,
      factor,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    );
  }

  /* =========================================================
     拖动
     ========================================================= */

  function pointerDown(
    type,
    event
  ) {

    /*
     * 鼠标只响应左键
     */
    if (
      event.pointerType === 'mouse' &&
      event.button !== 0
    ) {
      return;
    }

    const state =
      getState(type);

    const drag =
      getDragState(type);

    drag.active = true;
    drag.moved = false;

    drag.pointerId =
      event.pointerId;

    drag.startClientX =
      event.clientX;

    drag.startClientY =
      event.clientY;

    drag.startX =
      state.x;

    drag.startY =
      state.y;

    const svg =
      getSvg(type);

    if (svg) {

      svg.classList.add(
        'is-dragging'
      );

      try {
        svg.setPointerCapture(
          event.pointerId
        );
      } catch (_) {}
    }

    event.preventDefault();
  }

  function pointerMove(
    type,
    event
  ) {

    const drag =
      getDragState(type);

    if (!drag.active) {
      return;
    }

    if (
      drag.pointerId !==
      event.pointerId
    ) {
      return;
    }

    const svg =
      getSvg(type);

    const state =
      getState(type);

    if (!svg) {
      return;
    }

    const start =
      clientToSvg(
        svg,
        drag.startClientX,
        drag.startClientY
      );

    const current =
      clientToSvg(
        svg,
        event.clientX,
        event.clientY
      );

    const dx =
      current.x - start.x;

    const dy =
      current.y - start.y;

    /*
     * 达到阈值才算真正拖动
     */
    if (
      Math.abs(dx) > 3 ||
      Math.abs(dy) > 3
    ) {
      drag.moved = true;
    }

    state.x =
      drag.startX + dx;

    state.y =
      drag.startY + dy;

    clampPosition(type);

    applyTransform(type);

    event.preventDefault();
  }

  function pointerUp(
    type,
    event
  ) {

    const drag =
      getDragState(type);

    if (!drag.active) {
      return;
    }

    if (
      drag.pointerId !==
      event.pointerId
    ) {
      return;
    }

    const svg =
      getSvg(type);

    if (svg) {

      svg.classList.remove(
        'is-dragging'
      );

      try {
        svg.releasePointerCapture(
          event.pointerId
        );
      } catch (_) {}
    }

    /*
     * 拖动结束后短暂屏蔽 click
     */
    if (drag.moved) {

      suppressClickUntil =
        Date.now() + 250;
    }

    drag.active = false;
    drag.moved = false;
    drag.pointerId = null;

    event.preventDefault();
  }

  function pointerCancel(
    type,
    event
  ) {

    const drag =
      getDragState(type);

    const svg =
      getSvg(type);

    if (svg) {
      svg.classList.remove(
        'is-dragging'
      );
    }

    drag.active = false;
    drag.moved = false;
    drag.pointerId = null;
  }

  /* =========================================================
     节点点击
     ========================================================= */

  function selectNode(id) {

    document
      .querySelectorAll(
        '.rel-node.selected'
      )
      .forEach(node => {
        node.classList.remove(
          'selected'
        );
      });

    document
      .querySelectorAll(
        `.rel-node[data-id="${id}"]`
      )
      .forEach(node => {
        node.classList.add(
          'selected'
        );
      });
  }

  function openDetail(
    type,
    id
  ) {

    /*
     * 刚拖动结束，不打开详情
     */
    if (
      Date.now() <
      suppressClickUntil
    ) {
      return;
    }

    WorldState.select(
      type,
      id,
      'overview'
    );

    selectNode(id);

    /*
     * 打开右侧详情
     */
    if (
      window.SidebarUI
    ) {

      if (
        typeof SidebarUI.open ===
        'function'
      ) {
        SidebarUI.open();
      }

      if (
        typeof SidebarUI.renderSelected ===
        'function'
      ) {
        SidebarUI.renderSelected();
      }
    }
  }

  /* =========================================================
     SVG 工具
     ========================================================= */

  function createSvg(
    tag,
    attrs = {}
  ) {

    const element =
      document.createElementNS(
        NS,
        tag
      );

    Object.entries(attrs)
      .forEach(
        ([key, value]) => {
          element.setAttribute(
            key,
            value
          );
        }
      );

    return element;
  }

  /* =========================================================
     关系线
     ========================================================= */

  function createEdge(
    edge,
    nodeMap
  ) {

    const from =
      nodeMap[edge.from];

    const to =
      nodeMap[edge.to];

    if (!from || !to) {
      return null;
    }

    const dx =
      to.x - from.x;

    const dy =
      to.y - from.y;

    const len =
      Math.hypot(dx, dy) || 1;

    const ux =
      dx / len;

    const uy =
      dy / len;

    const x1 =
      from.x + ux * 16;

    const y1 =
      from.y + uy * 16;

    const x2 =
      to.x - ux * 16;

    const y2 =
      to.y - uy * 16;

    const fragment =
      document.createDocumentFragment();

    const line =
      createSvg(
        'line',
        {
          x1,
          y1,
          x2,
          y2,
          stroke:
            edge.color ||
            '#4a5665',
          'stroke-width': 1.6
        }
      );

    line.classList.add(
      'rel-edge'
    );

    if (
      WorldState.currentYear <
      edge.startYear
    ) {
      line.classList.add(
        'future'
      );
    }

    if (
      edge.endYear &&
      WorldState.currentYear >
      edge.endYear
    ) {
      line.classList.add(
        'rel-edge-ended'
      );
    }

    if (edge.dashed) {
      line.setAttribute(
        'stroke-dasharray',
        '4 3'
      );
    }

    fragment.appendChild(
      line
    );

    const label =
      createSvg(
        'text',
        {
          x:
            (x1 + x2) / 2,

          y:
            (y1 + y2) / 2 - 3
        }
      );

    label.classList.add(
      'rel-edge-label'
    );

    label.textContent =
      edge.label || '';

    fragment.appendChild(
      label
    );

    return fragment;
  }

  /* =========================================================
     节点
     ========================================================= */

  function createNode(
    node,
    type
  ) {

    const future =
      WorldMap.isFuture(
        node,
        WorldState.currentYear
      );

    const ended =
      WorldMap.isEnded(
        node,
        WorldState.currentYear
      );

    const group =
      createSvg('g');

    group.classList.add(
      'rel-node'
    );

    group.dataset.id =
      node.id;

    group.dataset.entityType =
      type;

    if (future) {
      group.classList.add(
        'future'
      );
    }

    if (ended) {
      group.classList.add(
        'rel-node-ended'
      );
    }

    group.style.color =
      node.color ||
      '#d4a76a';

    /*
     * 光晕
     */
    const halo =
      createSvg(
        'circle',
        {
          cx: node.x,
          cy: node.y,
          r: 16,
          fill:
            node.color ||
            '#d4a76a',
          opacity: .12
        }
      );

    halo.classList.add(
      'rel-halo'
    );

    /*
     * 外圈
     */
    const ring =
      createSvg(
        'circle',
        {
          cx: node.x,
          cy: node.y,
          r: 10,
          fill: 'none',
          stroke:
            node.color ||
            '#d4a76a',
          'stroke-width': 1,
          opacity: .35
        }
      );

    ring.classList.add(
      'rel-ring'
    );

    /*
     * 中心圆
     */
    const dot =
      createSvg(
        'circle',
        {
          cx: node.x,
          cy: node.y,
          r: 8,
          fill:
            node.color ||
            '#d4a76a',
          stroke: '#0e1116',
          'stroke-width': 2
        }
      );

    dot.classList.add(
      'dot',
      'rel-core'
    );

    /*
     * 状态点
     */
    const stateDot =
      createSvg(
        'circle',
        {
          cx: node.x + 9,
          cy: node.y - 9,
          r: 3,
          fill:
            active(node)
              ? (
                  node.color ||
                  '#d4a76a'
                )
              : '#596574'
        }
      );

    stateDot.classList.add(
      'rel-state-dot'
    );

    /*
     * 名称背景
     */
    const labelBg =
      createSvg(
        'rect',
        {
          x: node.x - 34,
          y: node.y + 17,
          width: 68,
          height: 27,
          rx: 6,

          fill: '#111821',

          'fill-opacity': .82,

          stroke:
            node.color ||
            '#d4a76a',

          'stroke-opacity': .22
        }
      );

    labelBg.classList.add(
      'rel-label-bg'
    );

    /*
     * 名称
     */
    const name =
      createSvg(
        'text',
        {
          x: node.x,
          y: node.y + 28
        }
      );

    name.classList.add(
      'rel-name'
    );

    name.textContent =
      node.name || '';

    /*
     * 身份
     */
    const role =
      createSvg(
        'text',
        {
          x: node.x,
          y: node.y + 40
        }
      );

    role.classList.add(
      'rel-role'
    );

    if (active(node)) {

      role.textContent =
        node.role || '';

    } else if (future) {

      role.textContent =
        '尚未登场';

    } else {

      role.textContent =
        '已离场';
    }

    /*
     * 点击热区
     */
    const hit =
      createSvg(
        'rect',
        {
          x: node.x - 40,
          y: node.y - 16,
          width: 80,
          height: 68,
          rx: 10,

          fill: '#ffffff',

          'fill-opacity': .001,

          'pointer-events': 'all'
        }
      );

    hit.classList.add(
      'rel-hit'
    );

    group.appendChild(
      halo
    );

    group.appendChild(
      ring
    );

    group.appendChild(
      dot
    );

    group.appendChild(
      stateDot
    );

    group.appendChild(
      labelBg
    );

    group.appendChild(
      name
    );

    group.appendChild(
      role
    );

    /*
     * 热区必须最后添加
     */
    group.appendChild(
      hit
    );

    /*
     * 点击节点
     */
    group.addEventListener(
      'click',
      event => {

        event.preventDefault();

        event.stopPropagation();

        if (
          Date.now() <
          suppressClickUntil
        ) {
          return;
        }

        if (future) {

          if (
            typeof showToast ===
            'function'
          ) {
            showToast(
              `“${node.name}”将在天启${WorldUtils.toCN(node.startYear)}年${
                type === 'character'
                  ? '登场'
                  : '开放'
              }`
            );
          }

          return;
        }

        openDetail(
          type,
          node.id
        );
      }
    );

    return group;
  }

  /*
   * 这里一定要放在文件上方，
   * 否则 createNode 中 active() 找不到。
   */
  function active(item) {
    return WorldMap.isActive(
      item,
      WorldState.currentYear
    );
  }

  /* =========================================================
     绘制
     ========================================================= */

  function renderGraph(
    edgesId,
    nodesId,
    nodes,
    edges,
    type
  ) {

    const edgesBox =
      document.getElementById(
        edgesId
      );

    const nodesBox =
      document.getElementById(
        nodesId
      );

    if (!edgesBox || !nodesBox) {
      return;
    }

    edgesBox.innerHTML = '';
    nodesBox.innerHTML = '';

    const nodeMap =
      Object.fromEntries(
        nodes.map(
          node => [
            node.id,
            node
          ]
        )
      );

    /*
     * 关系线
     */
    edges.forEach(
      edge => {

        const fragment =
          createEdge(
            edge,
            nodeMap
          );

        if (fragment) {
          edgesBox.appendChild(
            fragment
          );
        }
      }
    );

    /*
     * 节点
     */
    nodes.forEach(
      node => {

        nodesBox.appendChild(
          createNode(
            node,
            type
          )
        );
      }
    );

    const state =
      getState(type);

    if (!state.initialized) {
      fitGraph(type);
    } else {
      clampPosition(type);
      applyTransform(type);
    }
  }

  /* =========================================================
     选中状态
     ========================================================= */

  function syncSelectionVisuals() {

    document
      .querySelectorAll(
        '.rel-node.selected'
      )
      .forEach(
        node =>
          node.classList.remove(
            'selected'
          )
      );

    const selected =
      WorldState.selectedEntity;

    if (!selected) {
      return;
    }

    document
      .querySelectorAll(
        `.rel-node[data-id="${selected.id}"]`
      )
      .forEach(
        node =>
          node.classList.add(
            'selected'
          )
      );
  }

  /* =========================================================
     描述文字
     ========================================================= */

  function updateDescriptions() {

    const year =
      WorldState.currentYear;

    const activeF =
      WorldData.factions
        .filter(
          x =>
            WorldMap.isActive(
              x,
              year
            )
        )
        .length;

    const activeC =
      WorldData.characters
        .filter(
          x =>
            WorldMap.isActive(
              x,
              year
            )
        )
        .length;

    const activeFR =
      WorldData.factionRelations
        .filter(
          x =>
            WorldMap.isActive(
              x,
              year
            )
        )
        .length;

    const activeCR =
      WorldData.characterRelations
        .filter(
          x =>
            WorldMap.isActive(
              x,
              year
            )
        )
        .length;

    const factionDesc =
      document.getElementById(
        'factionPageDesc'
      );

    const relationDesc =
      document.getElementById(
        'relationPageDesc'
      );

    if (factionDesc) {

      factionDesc.textContent =
        `天启${WorldUtils.toCN(year)}年 · ` +
        `${activeF}/${WorldData.factions.length} 个势力参与世界状态 · ` +
        `${activeFR}/${WorldData.factionRelations.length} 条关系生效`;
    }

    if (relationDesc) {

      relationDesc.textContent =
        `天启${WorldUtils.toCN(year)}年 · ` +
        `${activeC}/${WorldData.characters.length} 位人物在场 · ` +
        `${activeCR}/${WorldData.characterRelations.length} 条关系生效`;
    }
  }

  /* =========================================================
     绑定关系图事件
     ========================================================= */

  function bindGraph(
    type
  ) {

    const svg =
      getSvg(type);

    if (!svg) {
      return;
    }

    /*
     * 重要：
     * 直接绑定到 SVG，
     * 不依赖父级。
     */

    svg.style.pointerEvents =
      'auto';

    svg.style.touchAction =
      'none';

    /*
     * pointerdown
     */
    svg.addEventListener(
      'pointerdown',
      event => {

        pointerDown(
          type,
          event
        );

      }
    );

    /*
     * pointermove
     */
    svg.addEventListener(
      'pointermove',
      event => {

        pointerMove(
          type,
          event
        );

      }
    );

    /*
     * pointerup
     */
    svg.addEventListener(
      'pointerup',
      event => {

        pointerUp(
          type,
          event
        );

      }
    );

    /*
     * pointercancel
     */
    svg.addEventListener(
      'pointercancel',
      event => {

        pointerCancel(
          type,
          event
        );

      }
    );

    /*
     * wheel
     */
    svg.addEventListener(
      'wheel',
      event => {

        event.preventDefault();

        event.stopPropagation();

        const factor =
          event.deltaY > 0
            ? 0.88
            : 1.14;

        zoomAtPoint(
          type,
          factor,
          event.clientX,
          event.clientY
        );

      },
      {
        passive: false
      }
    );

    /*
     * 双击恢复
     */
    svg.addEventListener(
      'dblclick',
      event => {

        event.preventDefault();

        event.stopPropagation();

        reset(type);
      }
    );
  }

  /* =========================================================
     顶部缩放按钮
     ========================================================= */

  function bindToolbar() {

    const zoomIn =
      document.getElementById(
        'zoomInBtn'
      );

    const zoomOut =
      document.getElementById(
        'zoomOutBtn'
      );

    const resetBtn =
      document.getElementById(
        'resetViewBtn'
      );

    if (zoomIn) {

      zoomIn.addEventListener(
        'click',
        event => {

          event.stopPropagation();

          const tab =
            document.body.dataset.tab;

          if (tab === 'faction') {

            zoomCenter(
              'faction',
              1.2
            );

          } else if (
            tab === 'relation'
          ) {

            zoomCenter(
              'character',
              1.2
            );
          }
        }
      );
    }

    if (zoomOut) {

      zoomOut.addEventListener(
        'click',
        event => {

          event.stopPropagation();

          const tab =
            document.body.dataset.tab;

          if (tab === 'faction') {

            zoomCenter(
              'faction',
              1 / 1.2
            );

          } else if (
            tab === 'relation'
          ) {

            zoomCenter(
              'character',
              1 / 1.2
            );
          }
        }
      );
    }

    if (resetBtn) {

      resetBtn.addEventListener(
        'click',
        event => {

          event.stopPropagation();

          const tab =
            document.body.dataset.tab;

          if (tab === 'faction') {

            reset('faction');

          } else if (
            tab === 'relation'
          ) {

            reset('character');
          }
        }
      );
    }
  }

  /* =========================================================
     初始化
     ========================================================= */

  function init() {

    renderAll();

    bindGraph('faction');
    bindGraph('character');

    bindToolbar();

    WorldState.on(
      reason => {

        if (
          reason === 'year'
        ) {
          renderAll();
          return;
        }

        if (
          reason === 'selection'
        ) {
          syncSelectionVisuals();
          return;
        }

        if (
          reason === 'selectionClear'
        ) {
          syncSelectionVisuals();
          return;
        }
      }
    );

    window.addEventListener(
      'resize',
      () => {

        applyTransform(
          'faction'
        );

        applyTransform(
          'character'
        );
      }
    );
  }

  /* =========================================================
     全部渲染
     ========================================================= */

  function renderAll() {

    renderGraph(
      'factionEdges',
      'factionNodes',
      WorldData.factions,
      WorldData.factionRelations,
      'faction'
    );

    renderGraph(
      'relationEdges',
      'relationNodes',
      WorldData.characters,
      WorldData.characterRelations,
      'character'
    );

    updateDescriptions();

    syncSelectionVisuals();
  }

  return {
    init,
    renderAll,
    syncSelectionVisuals,
    reset,
    zoomCenter,
    zoomAtPoint
  };

})();
