window.RelationUI = (() => {

  const NS = WorldUtils.svgNS;

  /*
   * ============================================================
   * 关系图基础尺寸
   *
   * SVG 的原始 viewBox：
   * 0 0 300 240
   *
   * 我们通过动态修改 viewBox 实现：
   *   - 缩放
   *   - 平移
   *
   * 不修改 SVG 内部节点坐标。
   * ============================================================
   */

  const WORLD_W = 300;
  const WORLD_H = 240;

  const MIN_ZOOM = 0.65;
  const MAX_ZOOM = 3.2;

  /*
   * 两张关系图分别保存自己的状态。
   */
  const graphStates = {
    faction: {
      svgId: 'factionEdges',
      nodeSvgId: 'factionNodes',
      viewX: 0,
      viewY: 0,
      viewW: WORLD_W,
      viewH: WORLD_H,

      pointerId: null,
      dragging: false,
      moved: false,
      startClientX: 0,
      startClientY: 0,
      startViewX: 0,
      startViewY: 0,
      suppressClickUntil: 0
    },

    character: {
      svgId: 'relationEdges',
      nodeSvgId: 'relationNodes',
      viewX: 0,
      viewY: 0,
      viewW: WORLD_W,
      viewH: WORLD_H,

      pointerId: null,
      dragging: false,
      moved: false,
      startClientX: 0,
      startClientY: 0,
      startViewX: 0,
      startViewY: 0,
      suppressClickUntil: 0
    }
  };


  /* ============================================================
     当前项目时间状态
  ============================================================ */

  function active(item) {

    return WorldMap.isActive(
      item,
      WorldState.currentYear
    );
  }


  /* ============================================================
     Zoom
  ============================================================ */

  function currentZoom(state) {

    return WORLD_W / state.viewW;
  }


  /* ============================================================
     限制 viewBox
     
     不允许拖动到完全看不到关系图内容的位置。
  ============================================================ */

  function clampView(state) {

    /*
     * X
     */
    if (state.viewW >= WORLD_W) {

      state.viewX =
        (WORLD_W - state.viewW) / 2;

    } else {

      const maxX =
        WORLD_W - state.viewW;

      state.viewX =
        Math.max(
          0,
          Math.min(
            maxX,
            state.viewX
          )
        );
    }


    /*
     * Y
     */
    if (state.viewH >= WORLD_H) {

      state.viewY =
        (WORLD_H - state.viewH) / 2;

    } else {

      const maxY =
        WORLD_H - state.viewH;

      state.viewY =
        Math.max(
          0,
          Math.min(
            maxY,
            state.viewY
          )
        );
    }
  }


  /* ============================================================
     应用 viewBox
  ============================================================ */

  function applyViewBox(state) {

    const svg =
      document.getElementById(
        state.svgId
      )?.closest('svg');

    if (!svg) {
      return;
    }

    clampView(state);

    svg.setAttribute(
      'viewBox',
      `${state.viewX} ${state.viewY} ${state.viewW} ${state.viewH}`
    );
  }


  /* ============================================================
     重置关系图视图
  ============================================================ */

  function resetGraphView(state) {

    state.viewX = 0;
    state.viewY = 0;

    state.viewW =
      WORLD_W;

    state.viewH =
      WORLD_H;

    state.moved =
      false;

    state.dragging =
      false;

    applyViewBox(state);
  }


  /* ============================================================
     获取 SVG
  ============================================================ */

  function getGraphSvg(state) {

    return document
      .getElementById(state.svgId)
      ?.closest('svg');
  }


  /* ============================================================
     鼠标位置转换为 SVG world 坐标
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
        x: 0,
        y: 0
      };
    }


    const rect =
      svg.getBoundingClientRect();


    const px =
      (clientX - rect.left) /
      rect.width;

    const py =
      (clientY - rect.top) /
      rect.height;


    return {

      x:
        state.viewX +
        px * state.viewW,

      y:
        state.viewY +
        py * state.viewH

    };
  }


  /* ============================================================
     鼠标位置缩放
     
     重点：
     缩放时保持鼠标指向的点不动。
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
          oldZoom * factor
        )
      );


    if (
      newZoom === oldZoom
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
      WORLD_W / newZoom;

    const newH =
      WORLD_H / newZoom;


    const svg =
      getGraphSvg(state);

    if (!svg) {
      return;
    }


    const rect =
      svg.getBoundingClientRect();


    const px =
      (clientX - rect.left) /
      rect.width;

    const py =
      (clientY - rect.top) /
      rect.height;


    state.viewW =
      newW;

    state.viewH =
      newH;


    /*
     * 让鼠标所在地图坐标保持在原来的屏幕位置。
     */
    state.viewX =
      point.x -
      px * newW;

    state.viewY =
      point.y -
      py * newH;


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
     * 超过 3px 才认为是真正拖动。
     */
    if (
      !state.moved &&
      Math.hypot(dx, dy) < 3
    ) {
      return;
    }


    state.moved =
      true;


    /*
     * 像素 -> viewBox 世界坐标
     */
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


    applyViewBox(state);
  }


  /* ============================================================
     绑定关系图缩放 / 拖动交互
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


    /*
     * 防止重复绑定。
     */
    if (
      svg.dataset.graphInteractionBound === '1'
    ) {
      return;
    }


    svg.dataset.graphInteractionBound =
      '1';


    /*
     * 鼠标 / 触摸视觉状态
     */
    svg.classList.add(
      'graph-pan-enabled'
    );


    /*
     * 初始 viewBox
     */
    applyViewBox(state);


    /* ----------------------------------------------------------
       Pointer Down
    ---------------------------------------------------------- */

    svg.addEventListener(
      'pointerdown',
      event => {

        /*
         * 只接受左键鼠标。
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
          /* 某些浏览器不支持时忽略 */
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
          state.pointerId !== event.pointerId
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
          state.pointerId !== event.pointerId
        ) {
          return;
        }


        if (state.moved) {

          /*
           * 拖动结束后，短时间内禁止 click。
           *
           * 防止：
           * 拖动画布 → 松开鼠标 → 误打开人物详情。
           */
          state.suppressClickUntil =
            performance.now() + 180;

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
          /* 忽略 */
        }


        /*
         * 稍后允许正常 click。
         */
        window.setTimeout(
          () => {

            state.moved =
              false;

          },
          220
        );

      }
    );


    /* ----------------------------------------------------------
       Pointer Cancel
    ---------------------------------------------------------- */

    svg.addEventListener(
      'pointercancel',
      event => {

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

        /*
         * 鼠标滚轮只控制关系图，
         * 不让外层信息页面一起滚动。
         */
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
        passive: false
      }
    );


    /* ----------------------------------------------------------
       双击恢复视图
    ---------------------------------------------------------- */

    svg.addEventListener(
      'dblclick',
      event => {

        event.preventDefault();
        event.stopPropagation();

        resetGraphView(
          state
        );

      }
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


    edgesBox.innerHTML = '';
    nodesBox.innerHTML = '';


    /*
     * 根据节点 id 建立快速查询表。
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


    /* ----------------------------------------------------------
       绘制关系线
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


        const dx =
          b.x - a.x;

        const dy =
          b.y - a.y;

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
          16;


        const x1 =
          a.x +
          ux * nodeRadius;

        const y1 =
          a.y +
          uy * nodeRadius;

        const x2 =
          b.x -
          ux * nodeRadius;

        const y2 =
          b.y -
          uy * nodeRadius;


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
          '1.6'
        );


        if (
          edge.dashed
        ) {

          line.setAttribute(
            'stroke-dasharray',
            '4 3'
          );

        }


        edgesBox.appendChild(
          line
        );


        /*
         * 关系文字
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
            (y1 + y2) / 2 - 3
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
       绘制节点
    ---------------------------------------------------------- */

    nodes.forEach(
      node => {

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


        if (future) {

          g.classList.add(
            'future'
          );

        }


        if (ended) {

          g.classList.add(
            'rel-node-ended'
          );

        }


        g.dataset.id =
          node.id;


        g.style.color =
          node.color;


        /* ------------------------------------------------------
           光晕
        ------------------------------------------------------ */

        const halo =
          document.createElementNS(
            NS,
            'circle'
          );

        halo.setAttribute(
          'cx',
          node.x
        );

        halo.setAttribute(
          'cy',
          node.y
        );

        halo.setAttribute(
          'r',
          '15'
        );

        halo.setAttribute(
          'fill',
          node.color
        );

        halo.setAttribute(
          'opacity',
          '.12'
        );

        g.appendChild(
          halo
        );


        /* ------------------------------------------------------
           中心节点
        ------------------------------------------------------ */

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
          node.x
        );

        dot.setAttribute(
          'cy',
          node.y
        );

        dot.setAttribute(
          'r',
          '8'
        );

        dot.setAttribute(
          'fill',
          node.color
        );

        dot.setAttribute(
          'stroke',
          '#0e1116'
        );

        dot.setAttribute(
          'stroke-width',
          '2'
        );

        g.appendChild(
          dot
        );


        /* ------------------------------------------------------
           人物 / 势力名称
        ------------------------------------------------------ */

        const name =
          document.createElementNS(
            NS,
            'text'
          );

        name.classList.add(
          'rel-name'
        );

        name.setAttribute(
          'x',
          node.x
        );

        name.setAttribute(
          'y',
          node.y + 26
        );

        name.textContent =
          node.name;

        g.appendChild(
          name
        );


        /* ------------------------------------------------------
           身份
        ------------------------------------------------------ */

        const role =
          document.createElementNS(
            NS,
            'text'
          );

        role.classList.add(
          'rel-role'
        );

        role.setAttribute(
          'x',
          node.x
        );

        role.setAttribute(
          'y',
          node.y + 37
        );


        role.textContent =
          active(node)
            ? node.role
            : (
                future
                  ? '尚未登场'
                  : '已离场'
              );


        g.appendChild(
          role
        );


        /* ------------------------------------------------------
           节点点击
        ------------------------------------------------------ */

        g.addEventListener(
          'click',
          event => {

            event.preventDefault();
            event.stopPropagation();


            /*
             * 如果刚刚拖动画布，
             * 禁止把拖动误判为点击节点。
             */
            const state =
              svg ===
              document.getElementById(
                'factionEdges'
              )?.closest('svg')
                ? graphStates.faction
                : graphStates.character;


            if (
              performance.now() <
              state.suppressClickUntil
            ) {
              return;
            }


            /*
             * 未登场人物 / 势力
             */
            if (future) {

              showToast(
                `“${node.name}”将在天启${WorldUtils.toCN(node.startYear)}年登场`
              );

              return;
            }


            /*
             * 当前统一状态源
             */
            WorldState.select(
              node.desc !== undefined
                ? 'character'
                : 'faction',
              node.id
            );

          }
        );


        nodesBox.appendChild(
          g
        );

      }
    );


    /*
     * 恢复当前选择的视觉状态。
     */
    syncSelectionVisuals();


    /*
     * 如果 SVG 已经存在，
     * 确保交互绑定不会因为重新 render 被重复绑定。
     */
    if (svg) {

      const state =
        nodesId === 'factionNodes'
          ? graphStates.faction
          : graphStates.character;

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
     同步选中状态
  ============================================================ */

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


    if (
      selected.type !== 'faction' &&
      selected.type !== 'character'
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
     重新绘制全部关系图
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
     页面说明信息
     
     当前 index.html 已经移除了可见的第二顶部模块。
     这里仅更新隐藏兼容元素。
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
        `天启${WorldUtils.toCN(year)}年 · ${activeF}/${window.WorldData.factions.length} 个势力参与世界状态 · ${activeFR}/${window.WorldData.factionRelations.length} 条关系生效`;
    }


    const relationDesc =
      document.getElementById(
        'relationPageDesc'
      );

    if (relationDesc) {

      relationDesc.textContent =
        `天启${WorldUtils.toCN(year)}年 · ${activeC}/${window.WorldData.characters.length} 位人物在场 · ${activeCR}/${window.WorldData.characterRelations.length} 条关系生效`;
    }

  }


  /* ============================================================
     初始化
  ============================================================ */

  function init() {

    /*
     * 先绑定关系图交互，
     * 确保即使当前页面还没有打开，
     * SVG 也能正常使用。
     */
    bindGraphInteraction(
      'factionEdges',
      graphStates.faction
    );

    bindGraphInteraction(
      'relationEdges',
      graphStates.character
    );


    renderAll();


    /*
     * 时间轴变化：
     * 重新渲染节点，
     * 但是不重置 viewBox。
     *
     * 所以：
     *   用户已经放大到 2 倍
     *   用户已经把关系图拖到右边
     *
     * 改年份后仍保持当前位置。
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

  }


  return {
    init,
    renderAll,
    syncSelectionVisuals
  };

})();
