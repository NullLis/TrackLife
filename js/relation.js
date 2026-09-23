window.RelationUI = (() => {

  const NS = WorldUtils.svgNS;


  /* ============================================================
     关系图设计尺寸

     原始数据坐标大约：
       X：44 ~ 256
       Y：44 ~ 216

     将 X 横向放大，让关系图更适合全屏宽屏显示。
  ============================================================ */

  const DESIGN_W = 420;
  const DESIGN_H = 240;

  const SOURCE_W = 300;
  const SOURCE_H = 240;

  const X_SCALE = DESIGN_W / SOURCE_W;


  /*
   * 初始显示比例。
   *
   * 1.00 = 完整设计区域
   * 1.08 = 稍微放大
   */
  const INITIAL_ZOOM = 1.08;


  /*
   * 鼠标滚轮缩放范围。
   */
  const MIN_ZOOM = 0.45;
  const MAX_ZOOM = 3.8;


  /*
   * 数据坐标中心。
   */
  const CENTER_X =
    DESIGN_W / 2;

  const CENTER_Y =
    DESIGN_H / 2;


  /* ============================================================
     图状态
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
     当前年份状态
  ============================================================ */

  function active(item) {

    return WorldMap.isActive(
      item,
      WorldState.currentYear
    );

  }


  /* ============================================================
     当前状态文字
  ============================================================ */

  function getCurrentStatus(item) {

    if (!item || !Array.isArray(item.statuses)) {

      return '';

    }


    const current =
      item.statuses.find(
        status =>
          WorldState.currentYear >= status.from &&
          WorldState.currentYear <= status.to
      );


    return current?.label || '';

  }


  /* ============================================================
     数据坐标 -> 关系图坐标
  ============================================================ */

  function graphX(x) {

    return CENTER_X +
      (x - SOURCE_W / 2) *
      X_SCALE;

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
     获取 SVG
  ============================================================ */

  function getGraphSvg(state) {

    return document
      .getElementById(
        state.svgId
      )
      ?.closest('svg');

  }


  /* ============================================================
     获取 SVG 尺寸
  ============================================================ */

  function getSvgAspect(state) {

    const svg =
      getGraphSvg(state);


    if (!svg) {

      return DESIGN_W / DESIGN_H;

    }


    const rect =
      svg.getBoundingClientRect();


    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {

      return DESIGN_W / DESIGN_H;

    }


    return (
      rect.width /
      rect.height
    );

  }


  /* ============================================================
     根据浏览器实际比例计算初始 ViewBox
     
     这样：
       16:9
       16:10
       4:3
       手机竖屏
     
     都不会因为 SVG 比例不同产生严重变形。
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
       * 增加可视世界宽度。
       */
      baseH =
        DESIGN_H;

      baseW =
        DESIGN_H *
        aspect;

    } else {

      /*
       * 屏幕更高：
       * 增加可视世界高度。
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
     限制 ViewBox

     重点：
     ------------------------------------------------------------
     旧版本的问题：

       if(viewW >= WORLD_W)
         viewX = center

     导致缩小后完全不能拖。

     现在允许：
       放大时拖
       默认比例拖
       缩小时拖
       超出设计区域后继续拖

     同时设置合理的拖动余量。
  ============================================================ */

  function clampRange(
    value,
    worldSize,
    viewSize
  ) {

    /*
     * 缩放后仍然是正常视野：
     * viewSize < worldSize
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
     * 缩小到整个设计区域
     * 都装进 ViewBox 后，
     * 仍然允许拖动。
     */
    const extra =
      Math.max(
        40,
        (
          viewSize -
          worldSize
        ) * 0.65
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


    clampView(state);


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
     初始视图 / 重置视图
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


    calculateBaseView(state);


    const zoom =
      INITIAL_ZOOM;


    state.viewW =
      state.baseViewW /
      zoom;


    state.viewH =
      state.baseViewH /
      zoom;


    /*
     * 始终以设计中心为中心。
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


    applyViewBox(state);

  }


  /* ============================================================
     鼠标 / 触摸坐标转换
  ============================================================ */

  function clientToWorld(
    state,
    clientX,
    clientY
  ) {

    const svg =
      getGraphSvg(state);


    if (!svg) {

      return {
        x:CENTER_X,
        y:CENTER_Y
      };

    }


    const rect =
      svg.getBoundingClientRect();


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
      currentZoom(state);


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
      getGraphSvg(state);


    if (!svg) {

      return;

    }


    const rect =
      svg.getBoundingClientRect();


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
     * 保持鼠标所在位置不跳动。
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


    applyViewBox(state);

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
      getGraphSvg(state);


    if (!svg) {

      return;

    }


    const rect =
      svg.getBoundingClientRect();


    const dx =
      clientX -
      state.startClientX;


    const dy =
      clientY -
      state.startClientY;


    /*
     * 3px 阈值：
     * 防止普通点击被识别成拖动。
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
      (
        dx /
        rect.width
      ) *
      state.viewW;


    const worldDY =
      (
        dy /
        rect.height
      ) *
      state.viewH;


    state.viewX =
      state.startViewX -
      worldDX;


    state.viewY =
      state.startViewY -
      worldDY;


    state.hasUserView =
      true;


    applyViewBox(state);

  }


  /* ============================================================
     图交互绑定
  ============================================================ */

  function bindGraphInteraction(
    svgId,
    state
  ) {

    const svg =
      document
        .getElementById(svgId)
        ?.closest('svg');


    if (!svg) {

      return;

    }


    if (
      svg.dataset.graphInteractionBound === '1'
    ) {

      return;

    }


    svg.dataset.graphInteractionBound =
      '1';


    svg.classList.add(
      'graph-pan-enabled'
    );


    applyViewBox(state);


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
          event.pointerType === 'mouse' &&
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
           * 拖动后禁止短时间 click。
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
       双击重置
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
     创建 SVG 文字标签
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
     * 中文字符宽度估算。
     */
    const nameWidth =
      Math.max(
        48,
        name.length *
          13 +
          22
      );


    const roleWidth =
      Math.max(
        54,
        String(role).length *
          7 +
          20
      );


    const labelWidth =
      Math.max(
        nameWidth,
        roleWidth
      );


    /*
     * 标签整体底板。
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
     * 人物 / 势力名称。
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
     * 身份 / 当前状态。
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
     * 根据人物 / 势力添加 class。
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
      edgesBox.closest('svg');


    const state =
      nodesId === 'factionNodes'
        ? graphStates.faction
        : graphStates.character;


    const isCharacter =
      nodesId === 'relationNodes';


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


    /* ----------------------------------------------------------
       关系线
    ---------------------------------------------------------- */

    edges.forEach(
      edge => {

        const a =
          nodeMap[edge.from];


        const b =
          nodeMap[edge.to];


        if (
          !a ||
          !b
        ) {

          return;

        }


        const ax =
          graphX(a.x);


        const ay =
          graphY(a.y);


        const bx =
          graphX(b.x);


        const by =
          graphY(b.y);


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


        /*
         * 节点外边缘。
         */
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
         * 关系文字。
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
            (x1 + x2) / 2
          );


          label.setAttribute(
            'y',
            (y1 + y2) / 2 - 4
          );


          label.textContent =
            edge.label;


          edgesBox.appendChild(
            label
          );

        }

      }
    );


    /* ----------------------------------------------------------
       节点
    ---------------------------------------------------------- */

    nodes.forEach(
      node => {

        const x =
          graphX(node.x);


        const y =
          graphY(node.y);


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
         * ------------------------------------------------------
         * 外层光晕
         * ------------------------------------------------------
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
         * ------------------------------------------------------
         * 外环
         * ------------------------------------------------------
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
         * ------------------------------------------------------
         * 中心圆
         * ------------------------------------------------------
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
         * ------------------------------------------------------
         * 中心高光
         * ------------------------------------------------------
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
         * ------------------------------------------------------
         * 当前状态小标记
         * ------------------------------------------------------
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
         * ------------------------------------------------------
         * 名称 + 身份
         * ------------------------------------------------------
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
         * ------------------------------------------------------
         * 点击节点
         * ------------------------------------------------------
         */

        g.addEventListener(
          'click',
          event => {

            event.preventDefault();

            event.stopPropagation();


            if (
              performance.now() <
              state.suppressClickUntil
            ) {

              return;

            }


            if (
              future
            ) {

              showToast(
                `“${node.name}”将在天启${WorldUtils.toCN(node.startYear)}年登场`
              );

              return;

            }


            /*
             * 直接使用 renderGraph 传入的 onClick。
             */
            if (
              typeof onClick ===
              'function'
            ) {

              onClick(node);

            }

          }
        );


        nodesBox.appendChild(
          g
        );

      }
    );


    syncSelectionVisuals();


    if (svg) {

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
     当前选中状态
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


    node?.classList.add(
      'selected'
    );

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

      node =>
        WorldState.select(
          'faction',
          node.id
        )

    );


    renderGraph(

      'relationEdges',

      'relationNodes',

      window.WorldData.characters,

      window.WorldData.characterRelations,

      node =>
        WorldState.select(
          'character',
          node.id
        )

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


    if (factionDesc) {

      factionDesc.textContent =
        `天启${WorldUtils.toCN(year)}年 · ` +
        `${activeF}/${window.WorldData.factions.length} ` +
        `个势力参与世界状态 · ` +
        `${activeFR}/${window.WorldData.factionRelations.length} ` +
        `条关系生效`;

    }


    const relationDesc =
      document.getElementById(
        'relationPageDesc'
      );


    if (relationDesc) {

      relationDesc.textContent =
        `天启${WorldUtils.toCN(year)}年 · ` +
        `${activeC}/${window.WorldData.characters.length} ` +
        `位人物在场 · ` +
        `${activeCR}/${window.WorldData.characterRelations.length} ` +
        `条关系生效`;

    }

  }


  /* ============================================================
     当前页面显示时自动重新适配初始比例
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
         * 用户没有手动缩放/拖动时，
         * 自动重新计算初始比例。
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

    bindGraphInteraction(
      'factionEdges',
      graphStates.faction
    );


    bindGraphInteraction(
      'relationEdges',
      graphStates.character
    );


    observePageVisibility(
      'iv-faction',
      graphStates.faction
    );


    observePageVisibility(
      'iv-relation',
      graphStates.character
    );


    /*
     * 第一次渲染。
     */
    renderAll();


    /*
     * 时间轴变化：
     * 节点重新渲染，但用户的视图不重置。
     */
    WorldState.on(
      reason => {

        if (
          reason === 'year' ||
          reason === 'selectionClear'
        ) {

          renderAll();

        }


        if (
          reason === 'selection'
        ) {

          syncSelectionVisuals();

        }

      }
    );


    /*
     * 窗口尺寸变化。
     */
    window.addEventListener(
      'resize',
      handleResize
    );


    /*
     * 第一次尝试建立初始视图。
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


  return {

    init,

    renderAll,

    syncSelectionVisuals

  };

})();
