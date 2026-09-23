window.RelationUI = (() => {

  const NS = WorldUtils.svgNS;

  /* =========================================================
     缩放配置
     ========================================================= */

  const MIN_ZOOM = 0.45;
  const MAX_ZOOM = 4.0;
  const INITIAL_ZOOM = 1.0;

  /*
   * 即使关系图比当前视口小，
   * 依然允许继续拖动。
   */
  const PAN_MARGIN_X = 0.35;
  const PAN_MARGIN_Y = 0.35;


  /* =========================================================
     关系图状态
     ========================================================= */

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


  /* =========================================================
     拖动状态
     ========================================================= */

  const dragStates = {

    faction: {

      active: false,

      moved: false,

      pointerId: null,

      startClientX: 0,

      startClientY: 0,

      startX: 0,

      startY: 0,

      pressNodeId: null

    },

    character: {

      active: false,

      moved: false,

      pointerId: null,

      startClientX: 0,

      startClientY: 0,

      startX: 0,

      startY: 0,

      pressNodeId: null

    }

  };


  /*
   * 防止一次点击同时触发：
   *
   * pointerup
   * +
   * click
   *
   * 导致详情重复打开。
   */
  let suppressClickUntil = 0;


  /* =========================================================
     基础 DOM
     ========================================================= */

  function getSvg(type) {

    if (type === 'faction') {

      return document.querySelector(
        '#iv-faction .graph-large-svg'
      );

    }

    return document.querySelector(
      '#iv-relation .graph-large-svg'
    );

  }


  function getState(type) {

    return graphStates[type];

  }


  function getDragState(type) {

    return dragStates[type];

  }


  /* =========================================================
     ViewBox
     ========================================================= */

  function getViewBox(svg) {

    if (!svg) {

      return {

        x: 0,

        y: 0,

        width: 300,

        height: 240

      };

    }


    const vb =
      svg.viewBox?.baseVal;


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


  /* =========================================================
     Clamp
     ========================================================= */

  function clamp(
    value,
    min,
    max
  ) {

    return Math.max(
      min,
      Math.min(
        max,
        value
      )
    );

  }


  /* =========================================================
     浏览器坐标 -> SVG 坐标
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


      point.x =
        clientX;


      point.y =
        clientY;


      const result =
        point.matrixTransform(
          matrix.inverse()
        );


      return {

        x: result.x,

        y: result.y

      };

    }


    /*
     * 备用转换
     */
    const rect =
      svg.getBoundingClientRect();


    const vb =
      getViewBox(svg);


    return {

      x:

        vb.x +

        (
          (
            clientX -
            rect.left
          ) /

          Math.max(
            rect.width,
            1
          )
        ) *

        vb.width,

      y:

        vb.y +

        (
          (
            clientY -
            rect.top
          ) /

          Math.max(
            rect.height,
            1
          )
        ) *

        vb.height

    };

  }


  /* =========================================================
     平移边界
     
     无论缩放比例大小，都允许拖动。
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
      vb.width *
      state.scale;


    const scaledHeight =
      vb.height *
      state.scale;


    const extraX =
      vb.width *
      PAN_MARGIN_X;


    const extraY =
      vb.height *
      PAN_MARGIN_Y;


    /* =======================================================
       X
       ======================================================= */

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


    /* =======================================================
       Y
       ======================================================= */

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
     应用 Transform
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


    if (
      !edges ||
      !nodes
    ) {

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
     初始化关系图
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
      (
        vb.width -
        vb.width *
          state.scale
      ) / 2;


    state.y =
      (
        vb.height -
        vb.height *
          state.scale
      ) / 2;


    clampPosition(type);


    state.initialized =
      true;


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

        oldScale *
          factor,

        MIN_ZOOM,

        MAX_ZOOM

      );


    if (

      Math.abs(
        newScale -
        oldScale
      ) < 0.00001

    ) {

      return;

    }


    const mouse =
      clientToSvg(
        svg,
        clientX,
        clientY
      );


    const contentX =
      (
        mouse.x -
        state.x
      ) / oldScale;


    const contentY =
      (
        mouse.y -
        state.y
      ) / oldScale;


    state.scale =
      newScale;


    state.x =
      mouse.x -
      contentX *
        newScale;


    state.y =
      mouse.y -
      contentY *
        newScale;


    clampPosition(type);


    applyTransform(type);

  }


  /* =========================================================
     居中缩放
     ========================================================= */

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

      rect.left +
        rect.width / 2,

      rect.top +
        rect.height / 2

    );

  }


  /* =========================================================
     节点选中
     ========================================================= */

  function selectNode(id) {

    document
      .querySelectorAll(
        '.rel-node.selected'
      )
      .forEach(
        node => {

          node.classList.remove(
            'selected'
          );

        }
      );


    document
      .querySelectorAll(
        `.rel-node[data-id="${id}"]`
      )
      .forEach(
        node => {

          node.classList.add(
            'selected'
          );

        }
      );

  }


  /* =========================================================
     获取实体
     ========================================================= */

  function getNodeData(
    type,
    id
  ) {

    const list =

      type === 'faction'

        ? WorldData.factions

        : WorldData.characters;


    if (!Array.isArray(list)) {

      return null;

    }


    return list.find(
      item =>
        item.id === id
    ) || null;

  }


  /* =========================================================
     打开详情
     ========================================================= */

  function openDetail(
    type,
    id
  ) {

    /*
     * 防止同一次点击重复触发。
     */
    if (
      Date.now() <
      suppressClickUntil
    ) {

      return;

    }


    const node =
      getNodeData(
        type,
        id
      );


    if (!node) {

      console.warn(
        '[RelationUI] 找不到实体:',
        type,
        id
      );

      return;

    }


    /*
     * 未来节点只提示，不打开详情。
     */
    if (
      WorldMap.isFuture(
        node,
        WorldState.currentYear
      )
    ) {

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


    /*
     * 统一状态
     */
    WorldState.select(
      type,
      id,
      'overview'
    );


    /*
     * 节点视觉选中
     */
    selectNode(id);


    /*
     * 右侧详情。
     *
     * SidebarUI 自己也监听 selection，
     * 这里额外调用是为了保证关系图点击
     * 一定能够进入详情。
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
     创建 SVG
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
     创建关系线
     ========================================================= */

  function createEdge(
    edge,
    nodeMap
  ) {

    const from =
      nodeMap[edge.from];


    const to =
      nodeMap[edge.to];


    if (
      !from ||
      !to
    ) {

      return null;

    }


    const dx =
      to.x -
      from.x;


    const dy =
      to.y -
      from.y;


    const len =
      Math.hypot(
        dx,
        dy
      ) || 1;


    const ux =
      dx / len;


    const uy =
      dy / len;


    const x1 =
      from.x +
      ux * 16;


    const y1 =
      from.y +
      uy * 16;


    const x2 =
      to.x -
      ux * 16;


    const y2 =
      to.y -
      uy * 16;


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

          'stroke-width':
            1.6

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


    if (
      edge.dashed
    ) {

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
            (
              x1 +
              x2
            ) / 2,

          y:
            (
              y1 +
              y2
            ) / 2 - 3

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
     创建节点
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
      createSvg(
        'g'
      );


    group.classList.add(
      'rel-node'
    );


    group.dataset.id =
      node.id;


    group.dataset.entityType =
      type;


    if (
      future
    ) {

      group.classList.add(
        'future'
      );

    }


    if (
      ended
    ) {

      group.classList.add(
        'rel-node-ended'
      );

    }


    group.style.color =
      node.color ||
      '#d4a76a';


    /* =======================================================
       光晕
       ======================================================= */

    const halo =
      createSvg(
        'circle',
        {

          cx:
            node.x,

          cy:
            node.y,

          r:
            16,

          fill:
            node.color ||
            '#d4a76a',

          opacity:
            .12

        }
      );


    halo.classList.add(
      'rel-halo'
    );


    /* =======================================================
       外圈
       ======================================================= */

    const ring =
      createSvg(
        'circle',
        {

          cx:
            node.x,

          cy:
            node.y,

          r:
            10,

          fill:
            'none',

          stroke:
            node.color ||
            '#d4a76a',

          'stroke-width':
            1,

          opacity:
            .35

        }
      );


    ring.classList.add(
      'rel-ring'
    );


    /* =======================================================
       中心点
       ======================================================= */

    const dot =
      createSvg(
        'circle',
        {

          cx:
            node.x,

          cy:
            node.y,

          r:
            8,

          fill:
            node.color ||
            '#d4a76a',

          stroke:
            '#0e1116',

          'stroke-width':
            2

        }
      );


    dot.classList.add(
      'dot',
      'rel-core'
    );


    /* =======================================================
       状态点
       ======================================================= */

    const stateDot =
      createSvg(
        'circle',
        {

          cx:
            node.x + 9,

          cy:
            node.y - 9,

          r:
            3,

          fill:

            WorldMap.isActive(
              node,
              WorldState.currentYear
            )

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


    /* =======================================================
       名称背景
       ======================================================= */

    const labelBg =
      createSvg(
        'rect',
        {

          x:
            node.x - 34,

          y:
            node.y + 17,

          width:
            68,

          height:
            27,

          rx:
            6,

          fill:
            '#111821',

          'fill-opacity':
            .82,

          stroke:
            node.color ||
            '#d4a76a',

          'stroke-opacity':
            .22

        }
      );


    labelBg.classList.add(
      'rel-label-bg'
    );


    /* =======================================================
       名称
       ======================================================= */

    const name =
      createSvg(
        'text',
        {

          x:
            node.x,

          y:
            node.y + 28

        }
      );


    name.classList.add(
      'rel-name'
    );


    name.textContent =
      node.name || '';


    /* =======================================================
       身份
       ======================================================= */

    const role =
      createSvg(
        'text',
        {

          x:
            node.x,

          y:
            node.y + 40

        }
      );


    role.classList.add(
      'rel-role'
    );


    if (

      WorldMap.isActive(
        node,
        WorldState.currentYear
      )

    ) {

      role.textContent =
        node.role || '';

    }

    else if (
      future
    ) {

      role.textContent =
        '尚未登场';

    }

    else {

      role.textContent =
        '已离场';

    }


    /* =======================================================
       点击热区
       ======================================================= */

    const hit =
      createSvg(
        'rect',
        {

          x:
            node.x - 40,

          y:
            node.y - 16,

          width:
            80,

          height:
            68,

          rx:
            10,

          fill:
            '#ffffff',

          'fill-opacity':
            .001,

          'pointer-events':
            'all'

        }
      );


    hit.classList.add(
      'rel-hit'
    );


    /* =======================================================
       添加节点内容
       ======================================================= */

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
     * 点击热区放最后。
     */
    group.appendChild(
      hit
    );


    /* =======================================================
       click 备用处理
       ======================================================= */

    group.addEventListener(
      'click',
      event => {

        event.stopPropagation();


        /*
         * 如果 pointerup 已经处理过，
         * 这里不重复执行。
         */
        if (
          Date.now() <
          suppressClickUntil
        ) {

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


  /* =========================================================
     绘制关系图
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


    if (
      !edgesBox ||
      !nodesBox
    ) {

      return;

    }


    edgesBox.innerHTML =
      '';


    nodesBox.innerHTML =
      '';


    const nodeMap =
      Object.fromEntries(

        nodes.map(
          node => [
            node.id,
            node
          ]
        )

      );


    /* -------------------------------------------------------
       关系线
    ------------------------------------------------------- */

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


    /* -------------------------------------------------------
       节点
    ------------------------------------------------------- */

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


    /*
     * 保留已有缩放/位置。
     */
    const state =
      getState(type);


    if (
      !state.initialized
    ) {

      fitGraph(type);

    }

    else {

      clampPosition(type);

      applyTransform(type);

    }

  }


  /* =========================================================
     同步选中状态
     ========================================================= */

  function syncSelectionVisuals() {

    document
      .querySelectorAll(
        '.rel-node.selected'
      )
      .forEach(
        node => {

          node.classList.remove(
            'selected'
          );

        }
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
        node => {

          node.classList.add(
            'selected'
          );

        }
      );

  }


  /* =========================================================
     更新描述
     ========================================================= */

  function updateDescriptions() {

    const year =
      WorldState.currentYear;


    const activeF =
      WorldData.factions
        .filter(
          item =>
            WorldMap.isActive(
              item,
              year
            )
        )
        .length;


    const activeC =
      WorldData.characters
        .filter(
          item =>
            WorldMap.isActive(
              item,
              year
            )
        )
        .length;


    const activeFR =
      WorldData.factionRelations
        .filter(
          item =>
            WorldMap.isActive(
              item,
              year
            )
        )
        .length;


    const activeCR =
      WorldData.characterRelations
        .filter(
          item =>
            WorldMap.isActive(
              item,
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


    if (
      factionDesc
    ) {

      factionDesc.textContent =

        `天启${WorldUtils.toCN(year)}年 · ` +

        `${activeF}/${WorldData.factions.length} 个势力参与世界状态 · ` +

        `${activeFR}/${WorldData.factionRelations.length} 条关系生效`;

    }


    if (
      relationDesc
    ) {

      relationDesc.textContent =

        `天启${WorldUtils.toCN(year)}年 · ` +

        `${activeC}/${WorldData.characters.length} 位人物在场 · ` +

        `${activeCR}/${WorldData.characterRelations.length} 条关系生效`;

    }

  }


  /* =========================================================
     Pointer Down

     这里是此次修复的关键。

     不再调用 event.preventDefault()。

     普通点击必须允许浏览器继续生成 click。
     ========================================================= */

  function pointerDown(
    type,
    event
  ) {

    /*
     * 鼠标只响应左键。
     */
    if (

      event.pointerType ===
      'mouse' &&

      event.button !== 0

    ) {

      return;

    }


    const state =
      getState(type);


    const drag =
      getDragState(type);


    drag.active =
      true;


    drag.moved =
      false;


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


    /*
     * 记录按下时所在节点。
     */
    drag.pressNodeId =
      null;


    let target =
      event.target;


    /*
     * SVGElement 一般支持 closest。
     */
    if (
      target &&
      typeof target.closest ===
      'function'
    ) {

      const node =
        target.closest(
          '.rel-node'
        );


      if (node) {

        drag.pressNodeId =
          node.dataset.id ||
          null;

      }

    }


    /*
     * 如果 target 本身没有 closest，
     * 再通过 parentElement 向上查找。
     */
    if (
      !drag.pressNodeId
    ) {

      let current =
        target;


      while (
        current &&
        current !==
          document
      ) {

        if (
          current.classList &&
          current.classList.contains(
            'rel-node'
          )
        ) {

          drag.pressNodeId =
            current.dataset.id ||
            null;


          break;

        }


        current =
          current.parentNode;

      }

    }


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

      }

      catch (_) {}

    }


    /*
     * 注意：
     *
     * 这里不能：
     *
     * event.preventDefault();
     *
     * 否则普通点击可能没有 click。
     */

  }


  /* =========================================================
     Pointer Move
     ========================================================= */

  function pointerMove(
    type,
    event
  ) {

    const drag =
      getDragState(type);


    if (
      !drag.active
    ) {

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
      current.x -
      start.x;


    const dy =
      current.y -
      start.y;


    /*
     * 超过阈值才算拖动。
     */
    if (

      Math.abs(dx) > 3 ||

      Math.abs(dy) > 3

    ) {

      drag.moved =
        true;

    }


    state.x =
      drag.startX +
      dx;


    state.y =
      drag.startY +
      dy;


    clampPosition(type);


    applyTransform(type);


    /*
     * 只有真正拖动时才阻止默认行为。
     */
    if (
      drag.moved
    ) {

      event.preventDefault();

    }

  }


  /* =========================================================
     Pointer Up

     这里直接处理点击详情。

     不再单纯依赖 click。
     ========================================================= */

  function pointerUp(
    type,
    event
  ) {

    const drag =
      getDragState(type);


    if (
      !drag.active
    ) {

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

      }

      catch (_) {}

    }


    const wasMoved =
      drag.moved;


    const pressNodeId =
      drag.pressNodeId;


    /*
     * =======================================================
     * 没有移动：
     *
     * 说明这是“点击”。
     * =======================================================
     */

    if (

      !wasMoved &&

      pressNodeId

    ) {

      /*
       * 防止后续 click 再执行一次。
       */
      suppressClickUntil =
        Date.now() + 350;


      openDetail(
        type,
        pressNodeId
      );

    }


    /*
     * =======================================================
     * 发生移动：
     *
     * 说明这是拖动。
     * =======================================================
     */

    else if (
      wasMoved
    ) {

      suppressClickUntil =
        Date.now() + 350;

    }


    /*
     * 重置拖动状态。
     */
    drag.active =
      false;


    drag.moved =
      false;


    drag.pointerId =
      null;


    drag.pressNodeId =
      null;

  }


  /* =========================================================
     Pointer Cancel
     ========================================================= */

  function pointerCancel(
    type
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


    drag.active =
      false;


    drag.moved =
      false;


    drag.pointerId =
      null;


    drag.pressNodeId =
      null;

  }


  /* =========================================================
     绑定关系图
     ========================================================= */

  function bindGraph(
    type
  ) {

    const svg =
      getSvg(type);


    if (!svg) {

      console.warn(
        '[RelationUI] 找不到 SVG:',
        type
      );

      return;

    }


    /*
     * 允许 SVG 接收事件。
     */
    svg.style.pointerEvents =
      'auto';


    /*
     * 禁止触摸时被浏览器当成页面滚动。
     */
    svg.style.touchAction =
      'none';


    /* -------------------------------------------------------
       Pointer Down
    ------------------------------------------------------- */

    svg.addEventListener(
      'pointerdown',
      event => {

        pointerDown(
          type,
          event
        );

      }
    );


    /* -------------------------------------------------------
       Pointer Move
    ------------------------------------------------------- */

    svg.addEventListener(
      'pointermove',
      event => {

        pointerMove(
          type,
          event
        );

      }
    );


    /* -------------------------------------------------------
       Pointer Up
    ------------------------------------------------------- */

    svg.addEventListener(
      'pointerup',
      event => {

        pointerUp(
          type,
          event
        );

      }
    );


    /* -------------------------------------------------------
       Pointer Cancel
    ------------------------------------------------------- */

    svg.addEventListener(
      'pointercancel',
      () => {

        pointerCancel(
          type
        );

      }
    );


    /* -------------------------------------------------------
       Wheel
    ------------------------------------------------------- */

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


    /* -------------------------------------------------------
       Double Click
    ------------------------------------------------------- */

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
     顶部缩放工具
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


    /* -------------------------------------------------------
       放大
    ------------------------------------------------------- */

    if (zoomIn) {

      zoomIn.addEventListener(
        'click',
        event => {

          event.stopPropagation();


          const tab =
            document.body.dataset.tab;


          if (
            tab === 'faction'
          ) {

            zoomCenter(
              'faction',
              1.2
            );

          }


          else if (
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


    /* -------------------------------------------------------
       缩小
    ------------------------------------------------------- */

    if (zoomOut) {

      zoomOut.addEventListener(
        'click',
        event => {

          event.stopPropagation();


          const tab =
            document.body.dataset.tab;


          if (
            tab === 'faction'
          ) {

            zoomCenter(
              'faction',
              1 / 1.2
            );

          }


          else if (
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


    /* -------------------------------------------------------
       重置
    ------------------------------------------------------- */

    if (resetBtn) {

      resetBtn.addEventListener(
        'click',
        event => {

          event.stopPropagation();


          const tab =
            document.body.dataset.tab;


          if (
            tab === 'faction'
          ) {

            reset(
              'faction'
            );

          }


          else if (
            tab === 'relation'
          ) {

            reset(
              'character'
            );

          }

        }
      );

    }

  }


  /* =========================================================
     初始化
     ========================================================= */

  function init() {

    /*
     * 首次绘制。
     */
    renderAll();


    /*
     * 绑定人物/势力关系图。
     */
    bindGraph(
      'faction'
    );


    bindGraph(
      'character'
    );


    /*
     * 绑定顶部工具。
     */
    bindToolbar();


    /* -------------------------------------------------------
       WorldState
    ------------------------------------------------------- */

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


    /* -------------------------------------------------------
       浏览器大小改变
    ------------------------------------------------------- */

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

    /*
     * 势力关系。
     */
    renderGraph(

      'factionEdges',

      'factionNodes',

      WorldData.factions,

      WorldData.factionRelations,

      'faction'

    );


    /*
     * 人物关系。
     */
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


  /* =========================================================
     对外接口
     ========================================================= */

  return {

    init,

    renderAll,

    syncSelectionVisuals,

    reset,

    zoomCenter,

    zoomAtPoint

  };

})();
