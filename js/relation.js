window.RelationUI = (() => {

  const NS = WorldUtils.svgNS;


  /* ============================================================
     关系图设计尺寸
  ============================================================ */

  const DESIGN_W = 420;
  const DESIGN_H = 240;

  const SOURCE_W = 300;
  const SOURCE_H = 240;

  /*
   * 将原始 300 宽的数据扩展到 420 宽。
   */
  const X_SCALE =
    DESIGN_W /
    SOURCE_W;


  /*
   * 初始显示比例。
   *
   * 1.08 = 比完整画布稍微放大。
   */
  const INITIAL_ZOOM = 1.08;


  /*
   * 滚轮缩放范围。
   */
  const MIN_ZOOM = 0.45;
  const MAX_ZOOM = 3.8;


  /*
   * 设计中心。
   */
  const CENTER_X =
    DESIGN_W / 2;

  const CENTER_Y =
    DESIGN_H / 2;


  /* ============================================================
     每一张关系图独立保存自己的状态
  ============================================================ */

  const graphStates = {

    faction: {

      svgId:
        'factionEdges',

      nodeSvgId:
        'factionNodes',

      viewX:0,
      viewY:0,

      viewW:
        DESIGN_W,

      viewH:
        DESIGN_H,

      baseViewW:
        DESIGN_W,

      baseViewH:
        DESIGN_H,

      pointerId:null,

      dragging:false,

      moved:false,

      hasUserView:false,

      startClientX:0,
      startClientY:0,

      startViewX:0,
      startViewY:0,

      suppressClickUntil:0

    },


    character: {

      svgId:
        'relationEdges',

      nodeSvgId:
        'relationNodes',

      viewX:0,
      viewY:0,

      viewW:
        DESIGN_W,

      viewH:
        DESIGN_H,

      baseViewW:
        DESIGN_W,

      baseViewH:
        DESIGN_H,

      pointerId:null,

      dragging:false,

      moved:false,

      hasUserView:false,

      startClientX:0,
      startClientY:0,

      startViewX:0,
      startViewY:0,

      suppressClickUntil:0

    }

  };


  /* ============================================================
     当前时间是否生效
  ============================================================ */

  function active(item) {

    return WorldMap.isActive(
      item,
      WorldState.currentYear
    );

  }


  /* ============================================================
     获取当前人物 / 势力状态
  ============================================================ */

  function getCurrentStatus(item) {

    if (
      !item ||
      !Array.isArray(
        item.statuses
      )
    ) {

      return '';

    }


    const current =
      item.statuses.find(
        status =>
          WorldState.currentYear >=
            status.from
          &&
          WorldState.currentYear <=
            status.to
      );


    return current?.label || '';

  }


  /* ============================================================
     原始数据坐标 -> 关系图坐标
  ============================================================ */

  function graphX(x) {

    return (
      CENTER_X +
      (
        x -
        SOURCE_W / 2
      ) *
      X_SCALE
    );

  }


  function graphY(y) {

    return y;

  }


  /* ============================================================
     当前 Zoom
  ============================================================ */

  function currentZoom(state) {

    return (
      state.baseViewW /
      state.viewW
    );

  }


  /* ============================================================
     获取关系图 SVG
  ============================================================ */

  function getGraphSvg(state) {

    return document
      .getElementById(
        state.svgId
      )
      ?.closest('svg');

  }


  /* ============================================================
     获取 SVG 当前实际比例
  ============================================================ */

  function getSvgAspect(state) {

    const svg =
      getGraphSvg(state);


    if (!svg) {

      return (
        DESIGN_W /
        DESIGN_H
      );

    }


    const rect =
      svg.getBoundingClientRect();


    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {

      return (
        DESIGN_W /
        DESIGN_H
      );

    }


    return (
      rect.width /
      rect.height
    );

  }


  /* ============================================================
     根据页面比例计算基础 ViewBox
  ============================================================ */

  function calculateBaseView(state) {

    const aspect =
      getSvgAspect(state);


    let baseW =
      DESIGN_W;

    let baseH =
      DESIGN_H;


    const designAspect =
      DESIGN_W /
      DESIGN_H;


    if (
      aspect >
      designAspect
    ) {

      /*
       * 屏幕更宽：
       * 增加横向可视区域。
       */
      baseH =
        DESIGN_H;

      baseW =
        DESIGN_H *
        aspect;

    } else {

      /*
       * 屏幕更高：
       * 增加纵向可视区域。
       */
      baseW =
        DESIGN_W;

      baseH =
        DESIGN_W /
        aspect;

    }


    state.baseViewW =
      baseW;

    state.baseViewH =
      baseH;

  }


  /* ============================================================
     ViewBox 拖动边界

     注意：

     旧逻辑：

       viewW >= WORLD_W
       ↓
       强制居中

     会导致缩小之后无法继续拖动。

     新逻辑：
       所有比例都允许移动。
  ============================================================ */

  function clampRange(
    value,
    worldSize,
    viewSize
  ) {

    /*
     * 正常放大状态。
     */
    if (
      viewSize <
      worldSize
    ) {

      const margin =
        Math.max(
          18,
          Math.min(
            80,
            viewSize * 0.12
          )
        );


      return Math.max(
        -margin,

        Math.min(
          worldSize -
            viewSize +
            margin,

          value
        )
      );

    }


    /*
     * ViewBox 大于设计区域：
     * 仍然允许拖动。
     */
    const extra =
      Math.max(
        40,

        (
          viewSize -
          worldSize
        ) *
        0.65
      );


    return Math.max(
      worldSize -
        viewSize -
        extra,

      Math.min(
        extra,
        value
      )
    );

  }


  function clampView(state) {

    state.viewX =
      clampRange(
        state.viewX,
        DESIGN_W,
        state.viewW
      );


    state.viewY =
      clampRange(
        state.viewY,
        DESIGN_H,
        state.viewH
      );

  }


  /* ============================================================
     应用 ViewBox
  ============================================================ */

  function applyViewBox(state) {

    const svg =
      getGraphSvg(state);


    if (!svg) {

      return;

    }


    clampView(
      state
    );


    svg.setAttribute(
      'viewBox',

      [
        state.viewX,
        state.viewY,
        state.viewW,
        state.viewH
      ].join(' ')
    );

  }


  /* ============================================================
     重置视图
  ============================================================ */

  function resetGraphView(
    state,
    force = false
  ) {

    if (
      state.hasUserView &&
      !force
    ) {

      return;

    }


    calculateBaseView(
      state
    );


    const zoom =
      INITIAL_ZOOM;


    state.viewW =
      state.baseViewW /
      zoom;


    state.viewH =
      state.baseViewH /
      zoom;


    /*
     * 以整个关系图中心作为默认中心。
     */
    state.viewX =
      CENTER_X -
      state.viewW / 2;


    state.viewY =
      CENTER_Y -
      state.viewH / 2;


    state.moved =
      false;

    state.dragging =
      false;


    applyViewBox(
      state
    );

  }


  /* ============================================================
     屏幕坐标 -> ViewBox 世界坐标
  ============================================================ */

  function clientToWorld(
    state,
    clientX,
    clientY
  ) {

    const svg =
      getGraphSvg(
        state
      );


    if (!svg) {

      return {

        x:CENTER_X,

        y:CENTER_Y

      };

    }


    const rect =
      svg.getBoundingClientRect();


    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {

      return {

        x:CENTER_X,

        y:CENTER_Y

      };

    }


    const px =
      (
        clientX -
        rect.left
      ) /
      rect.width;


    const py =
      (
        clientY -
        rect.top
      ) /
      rect.height;


    return {

      x:
        state.viewX +
        px *
        state.viewW,

      y:
        state.viewY +
        py *
        state.viewH

    };

  }


  /* ============================================================
     鼠标位置缩放
  ============================================================ */

  function zoomAtPoint(
    state,
    clientX,
    clientY,
    factor
  ) {

    const oldZoom =
      currentZoom(
        state
      );


    const newZoom =
      Math.max(
        MIN_ZOOM,

        Math.min(
          MAX_ZOOM,

          oldZoom *
          factor
        )
      );


    if (
      Math.abs(
        newZoom -
        oldZoom
      ) < 0.0001
    ) {

      return;

    }


    const point =
      clientToWorld(
        state,
        clientX,
        clientY
      );


    const newW =
      state.baseViewW /
      newZoom;


    const newH =
      state.baseViewH /
      newZoom;


    const svg =
      getGraphSvg(
        state
      );


    if (!svg) {

      return;

    }


    const rect =
      svg.getBoundingClientRect();


    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {

      return;

    }


    const px =
      (
        clientX -
        rect.left
      ) /
      rect.width;


    const py =
      (
        clientY -
        rect.top
      ) /
      rect.height;


    state.viewW =
      newW;


    state.viewH =
      newH;


    /*
     * 缩放时保持鼠标对应世界坐标不跳动。
     */
    state.viewX =
      point.x -
      px *
      newW;


    state.viewY =
      point.y -
      py *
      newH;


    state.hasUserView =
      true;


    applyViewBox(
      state
    );

  }


  /* ============================================================
     拖动
  ============================================================ */

  function moveGraph(
    state,
    clientX,
    clientY
  ) {

    const svg =
      getGraphSvg(
        state
      );


    if (!svg) {

      return;

    }


    const rect =
      svg.getBoundingClientRect();


    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {

      return;

    }


    const dx =
      clientX -
      state.startClientX;


    const dy =
      clientY -
      state.startClientY;


    /*
     * 超过 3px 才认为是真正拖动。
     */
    if (
      !state.moved &&
      Math.hypot(
        dx,
        dy
      ) < 3
    ) {

      return;

    }


    state.moved =
      true;


    const worldDX =
      dx /
      rect.width *
      state.viewW;


    const worldDY =
      dy /
      rect.height *
      state.viewH;


    state.viewX =
      state.startViewX -
      worldDX;


    state.viewY =
      state.startViewY -
      worldDY;


    state.hasUserView =
      true;


    applyViewBox(
      state
    );

  }


  /* ============================================================
     绑定关系图交互
  ============================================================ */

  function bindGraphInteraction(
    svgId,
    state
  ) {

    const svg =
      document
        .getElementById(
          svgId
        )
        ?.closest('svg');


    if (!svg) {

      return;

    }


    /*
     * 防止重复绑定。
     */
    if (
      svg.dataset.graphInteractionBound ===
      '1'
    ) {

      return;

    }


    svg.dataset.graphInteractionBound =
      '1';


    svg.classList.add(
      'graph-pan-enabled'
    );


    applyViewBox(
      state
    );


    /* ----------------------------------------------------------
       Pointer Down
    ---------------------------------------------------------- */

    svg.addEventListener(
      'pointerdown',
      event => {

        /*
         * 鼠标只接受左键。
         */
        if (
          event.pointerType ===
            'mouse' &&
          event.button !== 0
        ) {

          return;

        }


        state.pointerId =
          event.pointerId;


        state.dragging =
          true;


        state.moved =
          false;


        state.startClientX =
          event.clientX;


        state.startClientY =
          event.clientY;


        state.startViewX =
          state.viewX;


        state.startViewY =
          state.viewY;


        svg.classList.add(
          'graph-pan-active'
        );


        try {

          svg.setPointerCapture(
            event.pointerId
          );

        } catch (_) {

        }

      }
    );


    /* ----------------------------------------------------------
       Pointer Move
    ---------------------------------------------------------- */

    svg.addEventListener(
      'pointermove',
      event => {

        if (
          !state.dragging ||
          state.pointerId !==
            event.pointerId
        ) {

          return;

        }


        moveGraph(
          state,
          event.clientX,
          event.clientY
        );

      }
    );


    /* ----------------------------------------------------------
       Pointer Up
    ---------------------------------------------------------- */

    svg.addEventListener(
      'pointerup',
      event => {

        if (
          state.pointerId !==
          event.pointerId
        ) {

          return;

        }


        if (
          state.moved
        ) {

          /*
           * 拖动结束后短时间禁止 click。
           */
          state.suppressClickUntil =
            performance.now() +
            220;

        }


        state.dragging =
          false;


        state.pointerId =
          null;


        svg.classList.remove(
          'graph-pan-active'
        );


        try {

          svg.releasePointerCapture(
            event.pointerId
          );

        } catch (_) {

        }


        window.setTimeout(
          () => {

            state.moved =
              false;

          },
          240
        );

      }
    );


    /* ----------------------------------------------------------
       Pointer Cancel
    ---------------------------------------------------------- */

    svg.addEventListener(
      'pointercancel',
      () => {

        state.dragging =
          false;


        state.pointerId =
          null;


        state.moved =
          false;


        svg.classList.remove(
          'graph-pan-active'
        );

      }
    );


    /* ----------------------------------------------------------
       Wheel Zoom
    ---------------------------------------------------------- */

    svg.addEventListener(
      'wheel',
      event => {

        event.preventDefault();
        event.stopPropagation();


        const factor =
          event.deltaY > 0
            ? 1 / 1.15
            : 1.15;


        zoomAtPoint(
          state,
          event.clientX,
          event.clientY,
          factor
        );

      },
      {
        passive:false
      }
    );


    /* ----------------------------------------------------------
       Double Click Reset
    ---------------------------------------------------------- */

    svg.addEventListener(
      'dblclick',
      event => {

        event.preventDefault();
        event.stopPropagation();


        state.hasUserView =
          false;


        resetGraphView(
          state,
          true
        );

      }
    );

  }


  /* ============================================================
     创建节点标签
  ============================================================ */

  function createNodeLabel(
    node,
    g,
    future,
    isCharacter
  ) {

    const name =
      String(
        node.name || ''
      );


    const status =
      getCurrentStatus(
        node
      );


    const role =
      future
        ? '尚未登场'
        : (
            status ||
            node.role ||
            node.category ||
            ''
          );


    /*
     * 名称底板宽度。
     */
    const nameWidth =
      Math.max(
        48,
        name.length *
          13 +
          22
      );


    /*
     * 状态文字底板宽度。
     */
    const roleWidth =
      Math.max(
        54,
        String(
          role
        ).length *
          7 +
          20
      );


    const labelWidth =
      Math.max(
        nameWidth,
        roleWidth
      );


    /*
     * --------------------------------------------------------
     * 标签背景
     * --------------------------------------------------------
     */

    const plate =
      document.createElementNS(
        NS,
        'rect'
      );


    plate.classList.add(
      'rel-label-bg'
    );


    plate.setAttribute(
      'x',
      node.x -
        labelWidth / 2
    );


    plate.setAttribute(
      'y',
      node.y + 17
    );


    plate.setAttribute(
      'width',
      labelWidth
    );


    plate.setAttribute(
      'height',
      34
    );


    plate.setAttribute(
      'rx',
      8
    );


    g.appendChild(
      plate
    );


    /*
     * --------------------------------------------------------
     * 名称
     * --------------------------------------------------------
     */

    const nameText =
      document.createElementNS(
        NS,
        'text'
      );


    nameText.classList.add(
      'rel-name'
    );


    nameText.setAttribute(
      'x',
      node.x
    );


    nameText.setAttribute(
      'y',
      node.y + 31
    );


    nameText.textContent =
      name;


    g.appendChild(
      nameText
    );


    /*
     * --------------------------------------------------------
     * 身份 / 当前状态
     * --------------------------------------------------------
     */

    const roleText =
      document.createElementNS(
        NS,
        'text'
      );


    roleText.classList.add(
      'rel-role'
    );


    roleText.setAttribute(
      'x',
      node.x
    );


    roleText.setAttribute(
      'y',
      node.y + 45
    );


    roleText.textContent =
      role;


    g.appendChild(
      roleText
    );


    /*
     * --------------------------------------------------------
     * 真实点击区域
     *
     * 这是这次修复的关键。
     *
     * 原来的文字和背景：
     * pointer-events:none
     *
     * 用户点击文字时，
     * 浏览器很容易无法命中真正的 .rel-node。
     *
     * 现在创建一个透明矩形覆盖：
     *
     *   节点
     *   名称
     *   状态
     *
     * 全部可以点击。
     * --------------------------------------------------------
     */

    const hit =
      document.createElementNS(
        NS,
        'rect'
      );


    hit.classList.add(
      'rel-hit'
    );


    hit.setAttribute(
      'x',
      node.x -
        labelWidth / 2 -
        10
    );


    hit.setAttribute(
      'y',
      node.y -
        17
    );


    hit.setAttribute(
      'width',
      labelWidth +
        20
    );


    hit.setAttribute(
      'height',
      68
    );


    hit.setAttribute(
      'rx',
      9
    );


    hit.setAttribute(
      'fill',
      '#000000'
    );


    hit.setAttribute(
      'fill-opacity',
      '0.001'
    );


    hit.setAttribute(
      'stroke',
      'none'
    );


    /*
     * 放在 g 的最前面。
     *
     * 后面的视觉元素不接收 pointer，
     * 所以这个透明区域始终可以命中。
     */
    g.insertBefore(
      hit,
      g.firstChild
    );


    /*
     * 区分人物 / 势力。
     */
    g.classList.add(
      isCharacter
        ? 'character-node'
        : 'faction-node'
    );

  }


  /* ============================================================
     渲染关系图
  ============================================================ */

  function renderGraph(
    edgesId,
    nodesId,
    nodes,
    edges,
    onClick
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


    const svg =
      edgesBox.closest(
        'svg'
      );


    const state =
      nodesId ===
        'factionNodes'
        ? graphStates.faction
        : graphStates.character;


    const isCharacter =
      nodesId ===
      'relationNodes';


    /*
     * 当前年份重新绘制内容，
     * 但是不重置视图。
     */
    edgesBox.innerHTML =
      '';


    nodesBox.innerHTML =
      '';


    /*
     * 建立节点查询表。
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


    /* ==========================================================
       绘制关系线
    ========================================================== */

    edges.forEach(
      edge => {

        const a =
          nodeMap[
            edge.from
          ];


        const b =
          nodeMap[
            edge.to
          ];


        if (
          !a ||
          !b
        ) {

          return;

        }


        const ax =
          graphX(
            a.x
          );


        const ay =
          graphY(
            a.y
          );


        const bx =
          graphX(
            b.x
          );


        const by =
          graphY(
            b.y
          );


        const dx =
          bx - ax;


        const dy =
          by - ay;


        const len =
          Math.hypot(
            dx,
            dy
          ) || 1;


        const ux =
          dx / len;


        const uy =
          dy / len;


        const nodeRadius =
          isCharacter
            ? 13
            : 14;


        const x1 =
          ax +
          ux *
          nodeRadius;


        const y1 =
          ay +
          uy *
          nodeRadius;


        const x2 =
          bx -
          ux *
          nodeRadius;


        const y2 =
          by -
          uy *
          nodeRadius;


        const line =
          document.createElementNS(
            NS,
            'line'
          );


        line.classList.add(
          'rel-edge'
        );


        /*
         * 尚未开始的关系。
         */
        if (
          WorldState.currentYear <
          edge.startYear
        ) {

          line.classList.add(
            'future'
          );

        }


        /*
         * 已结束关系。
         */
        if (
          edge.endYear &&
          WorldState.currentYear >
          edge.endYear
        ) {

          line.classList.add(
            'rel-edge-ended'
          );

        }


        line.setAttribute(
          'x1',
          x1
        );


        line.setAttribute(
          'y1',
          y1
        );


        line.setAttribute(
          'x2',
          x2
        );


        line.setAttribute(
          'y2',
          y2
        );


        line.setAttribute(
          'stroke',
          edge.color ||
          '#4a5665'
        );


        line.setAttribute(
          'stroke-width',

          isCharacter
            ? '1.5'
            : '1.8'
        );


        line.setAttribute(
          'stroke-linecap',
          'round'
        );


        if (
          edge.dashed
        ) {

          line.setAttribute(
            'stroke-dasharray',
            '5 4'
          );

        }


        edgesBox.appendChild(
          line
        );


        /*
         * 关系标签。
         */
        if (
          edge.label
        ) {

          const label =
            document.createElementNS(
              NS,
              'text'
            );


          label.classList.add(
            'rel-edge-label'
          );


          label.setAttribute(
            'x',
            (
              x1 +
              x2
            ) / 2
          );


          label.setAttribute(
            'y',
            (
              y1 +
              y2
            ) / 2 -
            4
          );


          label.textContent =
            edge.label;


          edgesBox.appendChild(
            label
          );

        }

      }
    );


    /* ==========================================================
       绘制节点
    ========================================================== */

    nodes.forEach(
      node => {

        const x =
          graphX(
            node.x
          );


        const y =
          graphY(
            node.y
          );


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


        const g =
          document.createElementNS(
            NS,
            'g'
          );


        g.classList.add(
          'rel-node'
        );


        if (
          future
        ) {

          g.classList.add(
            'future'
          );

        }


        if (
          ended
        ) {

          g.classList.add(
            'rel-node-ended'
          );

        }


        g.dataset.id =
          node.id;


        g.style.color =
          node.color ||
          '#d4a76a';


        /*
         * ======================================================
           光晕
         * ======================================================
         */

        const halo =
          document.createElementNS(
            NS,
            'circle'
          );


        halo.classList.add(
          'rel-halo'
        );


        halo.setAttribute(
          'cx',
          x
        );


        halo.setAttribute(
          'cy',
          y
        );


        halo.setAttribute(
          'r',
          isCharacter
            ? '18'
            : '20'
        );


        halo.setAttribute(
          'fill',
          node.color ||
          '#d4a76a'
        );


        g.appendChild(
          halo
        );


        /*
         * ======================================================
           节点外环
         * ======================================================
         */

        const ring =
          document.createElementNS(
            NS,
            'circle'
          );


        ring.classList.add(
          'rel-ring'
        );


        ring.setAttribute(
          'cx',
          x
        );


        ring.setAttribute(
          'cy',
          y
        );


        ring.setAttribute(
          'r',
          isCharacter
            ? '11'
            : '12'
        );


        ring.setAttribute(
          'fill',
          '#0e1116'
        );


        ring.setAttribute(
          'stroke',
          node.color ||
          '#d4a76a'
        );


        ring.setAttribute(
          'stroke-width',

          isCharacter
            ? '2'
            : '2.4'
        );


        g.appendChild(
          ring
        );


        /*
         * ======================================================
           中心节点
         * ======================================================
         */

        const dot =
          document.createElementNS(
            NS,
            'circle'
          );


        dot.classList.add(
          'dot'
        );


        dot.setAttribute(
          'cx',
          x
        );


        dot.setAttribute(
          'cy',
          y
        );


        dot.setAttribute(
          'r',
          isCharacter
            ? '7'
            : '8'
        );


        dot.setAttribute(
          'fill',
          node.color ||
          '#d4a76a'
        );


        g.appendChild(
          dot
        );


        /*
         * ======================================================
           中心高光
         * ======================================================
         */

        const core =
          document.createElementNS(
            NS,
            'circle'
          );


        core.classList.add(
          'rel-core'
        );


        core.setAttribute(
          'cx',
          x - 1.5
        );


        core.setAttribute(
          'cy',
          y - 1.5
        );


        core.setAttribute(
          'r',
          isCharacter
            ? '2'
            : '2.2'
        );


        core.setAttribute(
          'fill',
          '#ffffff'
        );


        core.setAttribute(
          'opacity',
          '.62'
        );


        g.appendChild(
          core
        );


        /*
         * ======================================================
           状态小圆点
         * ======================================================
         */

        const currentStatus =
          getCurrentStatus(
            node
          );


        if (
          currentStatus ||
          future ||
          ended
        ) {

          const stateDot =
            document.createElementNS(
              NS,
              'circle'
            );


          stateDot.classList.add(
            'rel-state-dot'
          );


          stateDot.setAttribute(
            'cx',
            x + 10
          );


          stateDot.setAttribute(
            'cy',
            y - 10
          );


          stateDot.setAttribute(
            'r',
            '3.6'
          );


          stateDot.setAttribute(
            'fill',

            future
              ? '#58616d'

              : ended
                ? '#657180'

                : node.color
          );


          stateDot.setAttribute(
            'stroke',
            '#0e1116'
          );


          stateDot.setAttribute(
            'stroke-width',
            '1.5'
          );


          g.appendChild(
            stateDot
          );

        }


        /*
         * ======================================================
           名称与身份
         * ======================================================
         */

        createNodeLabel(
          {
            ...node,

            x,
            y
          },

          g,

          future,

          isCharacter
        );


        /*
         * ======================================================
           节点点击
         *
         * 使用 onClick：
         *
         * faction  -> WorldState.select('faction', id)
         * character -> WorldState.select('character', id)
         * ======================================================
         */

        g.addEventListener(
          'click',
          event => {

            event.preventDefault();

            event.stopPropagation();


            /*
             * 如果刚刚拖动画布，
             * 禁止误触。
             */
            if (
              performance.now() <
              state.suppressClickUntil
            ) {

              return;

            }


            /*
             * 尚未登场。
             */
            if (
              future
            ) {

              showToast(
                `“${node.name}”将在天启${WorldUtils.toCN(
                  node.startYear
                )}年登场`
              );

              return;

            }


            /*
             * 正常打开右侧详情。
             */
            if (
              typeof onClick ===
              'function'
            ) {

              onClick(
                node
              );

            }

          }
        );


        nodesBox.appendChild(
          g
        );

      }
    );


    /*
     * 同步当前选中状态。
     */
    syncSelectionVisuals();


    /*
     * 绑定交互。
     */
    if (
      svg
    ) {

      bindGraphInteraction(
        svg.id,
        state
      );


      applyViewBox(
        state
      );

    }

  }


  /* ============================================================
     同步节点选中状态
  ============================================================ */

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


    if (
      selected.type !==
        'faction' &&
      selected.type !==
        'character'
    ) {

      return;

    }


    const node =
      document.querySelector(
        `.rel-node[data-id="${selected.id}"]`
      );


    if (
      node
    ) {

      node.classList.add(
        'selected'
      );

    }

  }


  /* ============================================================
     渲染全部关系图
  ============================================================ */

  function renderAll() {

    renderGraph(

      'factionEdges',

      'factionNodes',

      window.WorldData.factions,

      window.WorldData.factionRelations,

      node => {

        WorldState.select(
          'faction',
          node.id
        );

      }

    );


    renderGraph(

      'relationEdges',

      'relationNodes',

      window.WorldData.characters,

      window.WorldData.characterRelations,

      node => {

        WorldState.select(
          'character',
          node.id
        );

      }

    );


    updateDescriptions();


    syncSelectionVisuals();

  }


  /* ============================================================
     更新隐藏说明
  ============================================================ */

  function updateDescriptions() {

    const year =
      WorldState.currentYear;


    const activeF =
      window.WorldData.factions
        .filter(
          faction =>
            WorldMap.isActive(
              faction,
              year
            )
        )
        .length;


    const activeC =
      window.WorldData.characters
        .filter(
          character =>
            WorldMap.isActive(
              character,
              year
            )
        )
        .length;


    const activeFR =
      window.WorldData.factionRelations
        .filter(
          relation =>
            WorldMap.isActive(
              relation,
              year
            )
        )
        .length;


    const activeCR =
      window.WorldData.characterRelations
        .filter(
          relation =>
            WorldMap.isActive(
              relation,
              year
            )
        )
        .length;


    const factionDesc =
      document.getElementById(
        'factionPageDesc'
      );


    if (
      factionDesc
    ) {

      factionDesc.textContent =
        `天启${WorldUtils.toCN(year)}年 · ` +
        `${activeF}/${window.WorldData.factions.length} 个势力参与世界状态 · ` +
        `${activeFR}/${window.WorldData.factionRelations.length} 条关系生效`;

    }


    const relationDesc =
      document.getElementById(
        'relationPageDesc'
      );


    if (
      relationDesc
    ) {

      relationDesc.textContent =
        `天启${WorldUtils.toCN(year)}年 · ` +
        `${activeC}/${window.WorldData.characters.length} 位人物在场 · ` +
        `${activeCR}/${window.WorldData.characterRelations.length} 条关系生效`;

    }

  }


  /* ============================================================
     页面激活监听
  ============================================================ */

  function observePageVisibility(
    sectionId,
    state
  ) {

    const section =
      document.getElementById(
        sectionId
      );


    if (!section) {

      return;

    }


    const observer =
      new MutationObserver(
        () => {

          if (
            section.classList.contains(
              'active'
            )
          ) {

            window.requestAnimationFrame(
              () => {

                if (
                  !state.hasUserView
                ) {

                  resetGraphView(
                    state
                  );

                }

              }
            );

          }

        }
      );


    observer.observe(
      section,
      {

        attributes:true,

        attributeFilter:[
          'class'
        ]

      }
    );

  }


  /* ============================================================
     窗口尺寸变化
  ============================================================ */

  function handleResize() {

    Object.values(
      graphStates
    ).forEach(
      state => {

        /*
         * 用户没有手动操作时，
         * 自动适配新尺寸。
         */
        if (
          !state.hasUserView
        ) {

          resetGraphView(
            state,
            true
          );

        }

      }
    );

  }


  /* ============================================================
     初始化
  ============================================================ */

  function init() {

    /*
     * 绑定两个关系图。
     */
    bindGraphInteraction(
      'factionEdges',
      graphStates.faction
    );


    bindGraphInteraction(
      'relationEdges',
      graphStates.character
    );


    /*
     * 关系图页面显示时自动适配。
     */
    observePageVisibility(
      'iv-faction',
      graphStates.faction
    );


    observePageVisibility(
      'iv-relation',
      graphStates.character
    );


    /*
     * 初始绘制。
     */
    renderAll();


    /*
     * 时间轴 / 状态变化。
     *
     * 重绘节点，
     * 但不重置用户当前的缩放和平移。
     */
    WorldState.on(
      reason => {

        if (
          reason === 'year' ||
          reason === 'selectionClear'
        ) {

          renderAll();

          return;

        }


        if (
          reason === 'selection'
        ) {

          syncSelectionVisuals();

        }

      }
    );


    /*
     * 浏览器尺寸变化。
     */
    window.addEventListener(
      'resize',
      handleResize
    );


    /*
     * 第一次建立初始视图。
     */
    window.requestAnimationFrame(
      () => {

        resetGraphView(
          graphStates.faction,
          true
        );


        resetGraphView(
          graphStates.character,
          true
        );

      }
    );

  }


  /* ============================================================
     对外接口
  ============================================================ */

  return {

    init,

    renderAll,

    syncSelectionVisuals

  };

})();
