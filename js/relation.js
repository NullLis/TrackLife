window.RelationUI = (() => {

  const NS = WorldUtils.svgNS;

  /* =========================================================
     缩放配置
     ========================================================= */

  const MIN_ZOOM = 0.45;
  const MAX_ZOOM = 4.0;
  const INITIAL_ZOOM = 1.0;

  /*
   * 当关系图比视口小时，
   * 依然允许拖动的额外空间。
   */
  const PAN_MARGIN_X = 0.35;
  const PAN_MARGIN_Y = 0.35;


  /* =========================================================
     两张关系图分别保存自己的状态
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

      /*
       * 鼠标/触摸按下时对应的节点。
       *
       * 即使 SVG 进行了 pointer capture，
       * 我们依然能够在 pointerup 时知道
       * 用户最初点击的是哪个节点。
       */
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
   * 防止：
   *
   * pointerup -> 打开详情
   * click    -> 再次打开详情
   *
   * 导致重复执行。
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
     获取 SVG ViewBox
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

        values.every(
          Number.isFinite
        ) &&

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
     数值限制
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
     判断节点是否为未来节点
     ========================================================= */

  function isFutureNode(node) {

    return WorldMap.isFuture(
      node,
      WorldState.currentYear
    );

  }


  /* =========================================================
     SVG / 浏览器坐标转换
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
     * getScreenCTM() 不可用时的备用方案
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
     
     非常重要：

     原来的逻辑：

       如果关系图比 SVG 小
       就强制居中。

     结果：

       scale < 1
       ↓
       用户拖动
       ↓
       clampPosition()
       ↓
       强制恢复到中心

     所以缩小之后实际上无法拖动。

     现在：
       无论缩放大小，都提供 X/Y 平移空间。
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


    /*
     * 额外平移区域
     */
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

      /*
       * 图比视口大
       */
      minX =
        vb.width -
        scaledWidth -
        extraX;


      maxX =
        extraX;

    } else {

      /*
       * 图比视口小
       *
       * 依然允许拖动。
       */
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
     应用关系图变换
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


    /*
     * 初始保持居中
     */
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


    /*
     * 应用可拖动范围
     */
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
     以某一个屏幕位置为中心缩放
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


    /*
     * 当前鼠标在 SVG 坐标系中的位置
     */
    const mouse =
      clientToSvg(
        svg,
        clientX,
        clientY
      );


    /*
     * 缩放前，
     * 鼠标对应的内容坐标
     */
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


    /*
     * 缩放后保持鼠标位置不跳
     */
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
     以 SVG 中心缩放
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
     节点选中视觉
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
     根据类型获取节点数据
     ========================================================= */

  function getNodeData(
    type,
    id
  ) {

    const list =
      type === 'faction'

        ? WorldData.factions

        : WorldData.characters;


    return list.find(
      node =>
        node.id === id
    );

  }


  /* =========================================================
     打开节点详情
     ========================================================= */

  function openDetail(
    type,
    id
  ) {

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

      return;

    }


    /*
     * 未来节点不进入详情。
     */
    if (
      isFutureNode(node)
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
     * 保存统一选中状态
     */
    WorldState.select(
      type,
      id,
      'overview'
    );


    /*
     * 更新关系图高亮
     */
    selectNode(id);


    /*
     * 强制打开右侧面板。
     *
     * SidebarUI 本身已经监听
     * WorldState.selection，
     * 这里再次调用是为了保证：
     *
     * 关系图 -> 详情
     *
     * 这条链路不会依赖监听初始化时序。
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
     SVG 元素创建
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


    /*
     * 关系线
     */
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


    /*
     * 关系文字
     */
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
      createSvg('g');


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


    /* =======================================================
       外圈
       ======================================================= */

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

          'stroke-width':
            1,

          opacity: .35

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

          cx: node.x,

          cy: node.y,

          r: 8,

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

          r: 3,

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

          width: 68,

          height: 27,

          rx: 6,

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

          x: node.x,

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

          x: node.x,

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

    } else if (
      future
    ) {

      role.textContent =
        '尚未登场';

    } else {

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

          width: 80,

          height: 68,

          rx: 10,

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
       添加子元素
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
     * 热区最后添加。
     *
     * 这样整个节点区域都能点击。
     */
    group.appendChild(
      hit
    );


    /* =======================================================
       普通 click 作为备用路径
       ======================================================= */

    group.addEventListener(
      'click',
      event => {

        /*
         * 防止冒泡到页面空白区域。
         */
        event.stopPropagation();


        /*
         * pointerup 已经处理过的点击，
         * 不再执行一次。
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
     渲染关系图
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


    /*
     * 清空旧节点
     */
    edgesBox.innerHTML =
      '';

    nodesBox.innerHTML =
      '';


    /*
     * 建立节点表
     */
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


    /*
     * 保留当前缩放和平移。
     */
    const state =
      getState(type);


    if (
      !state.initialized
    ) {

      fitGraph(type);

    } else {

      clampPosition(type);

      applyTransform(type);

    }

  }


  /* =========================================================
     选中状态同步
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
     更新关系图描述
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
     pointerdown
     
     这里只记录拖动起点。
     
     非常重要：
     不要在这里 preventDefault()。
     
     否则普通点击可能无法产生 click。
     ========================================================= */

  function pointerDown(
    type,
    event
  ) {

    /*
     * 鼠标只允许左键。
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
     * 记录用户最初按下的节点。
     *
     * 即使之后使用 pointer capture，
     * 我们也不会丢失节点信息。
     */
    drag.pressNodeId =
      null;


    const target =
      event.target;


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


    /*
     * 这里刻意不调用：
     *
     * event.preventDefault();
     *
     * 因为普通点击需要让浏览器继续生成 click。
     */

  }


  /* =========================================================
     pointermove
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
     * 只有真正移动超过阈值，
     * 才认为用户在拖动。
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
     * 只有真正拖动时阻止默认行为。
     *
     * 点击时不阻止。
     */
    if (
      drag.moved
    ) {

      event.preventDefault();

    }

  }


  /* =========================================================
     pointerup
     
     最关键：

     没发生拖动
     +
     按下时确实落在节点上
     =
     直接打开详情。

     这样不再依赖浏览器 click 的生成。
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

      } catch (_) {}

    }


    const wasMoved =
      drag.moved;


    const pressNodeId =
      drag.pressNodeId;


    /*
     * 点击而不是拖动。
     */
    if (
      !wasMoved &&
      pressNodeId
    ) {

      /*
       * 先设置屏蔽窗口，
       * 防止之后的原生 click 再执行一次。
       */
      suppressClickUntil =
        Date.now() + 300;


      openDetail(
        type,
        pressNodeId
      );

    }


    /*
     * 拖动结束：
     * 屏蔽可能产生的 click。
     */
    else if (
      wasMoved
    ) {

      suppressClickUntil =
        Date.now() + 300;

    }


    drag.active =
      false;


    drag.moved =
      false;


    drag.pointerId =
      null;


    drag.pressNodeId =
      null;


    /*
     * 不在这里调用 preventDefault。
     */

  }


  /* =========================================================
     pointercancel
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
     * 关系图可交互。
     */
    svg.style.pointerEvents =
      'auto';


    /*
     * 禁止浏览器将触摸拖动解释成页面滚动。
     */
    svg.style.touchAction =
      'none';


    /* =======================================================
       pointerdown
       ======================================================= */

    svg.addEventListener(
      'pointerdown',
      event => {

        pointerDown(
          type,
          event
        );

      }
    );


    /* =======================================================
       pointermove
       ======================================================= */

    svg.addEventListener(
      'pointermove',
      event => {

        pointerMove(
          type,
          event
        );

      }
    );


    /* =======================================================
       pointerup
       ======================================================= */

    svg.addEventListener(
      'pointerup',
      event => {

        pointerUp(
          type,
          event
        );

      }
    );


    /* =======================================================
       pointercancel
       ======================================================= */

    svg.addEventListener(
      'pointercancel',
      () => {

        pointerCancel(
          type
        );

      }
    );


    /* =======================================================
       鼠标滚轮缩放
       ======================================================= */

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


    /* =======================================================
       双击重置
       ======================================================= */

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
     顶部工具按钮
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


    /* =======================================================
       放大
       ======================================================= */

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


    /* =======================================================
       缩小
       ======================================================= */

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


    /* =======================================================
       重置
       ======================================================= */

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
     * 初次绘制。
     */
    renderAll();


    /*
     * 绑定两张关系图。
     */
    bindGraph(
      'faction'
    );


    bindGraph(
      'character'
    );


    /*
     * 顶部缩放按钮。
     */
    bindToolbar();


    /* =======================================================
       时间轴变化
       ======================================================= */

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


    /* =======================================================
       浏览器窗口尺寸变化
       ======================================================= */

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
     * 势力关系
     */
    renderGraph(

      'factionEdges',

      'factionNodes',

      WorldData.factions,

      WorldData.factionRelations,

      'faction'

    );


    /*
     * 人物关系
     */
    renderGraph(

      'relationEdges',

      'relationNodes',

      WorldData.characters,

      WorldData.characterRelations,

      'character'

    );


    /*
     * 顶部隐藏描述信息。
     */
    updateDescriptions();


    /*
     * 保持选中状态。
     */
    syncSelectionVisuals();

  }


  /* =========================================================
     对外 API
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
