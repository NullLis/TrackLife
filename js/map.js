window.WorldMap = (() => {

  const NS = WorldUtils.svgNS;

  const VIEW_W = 1600;
  const VIEW_H = 1013;

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let startX = 0;
  let startY = 0;


  /* =========================================================
     时间状态
  ========================================================= */

  function isActive(item, year) {

    const start =
      item.startYear ??
      item.year ??
      1;

    const end =
      item.endYear ??
      Infinity;

    return (
      year >= start &&
      year <= end
    );
  }


  function isFuture(item, year) {

    const start =
      item.startYear ??
      item.year ??
      1;

    return year < start;
  }


  function isEnded(item, year) {

    return (
      Number.isFinite(item.endYear) &&
      year > item.endYear
    );
  }


  function currentState(item, year) {

    const states =
      item.states || [];

    return (
      states.find(
        s =>
          year >= s.from &&
          year <= s.to
      )

      ||

      states
        .filter(
          s =>
            year >= s.from
        )
        .sort(
          (a, b) =>
            b.from - a.from
        )[0]

      ||

      null
    );
  }


  /* =========================================================
     地图区域
  ========================================================= */

  function renderRegions() {

    const box =
      document.getElementById(
        'mapRegions'
      );

    const labels =
      document.getElementById(
        'mapRegionLabels'
      );

    if (!box || !labels) {
      return;
    }

    box.innerHTML = '';
    labels.innerHTML = '';


    window.WorldData.regions.forEach(
      region => {

        const path =
          document.createElementNS(
            NS,
            'path'
          );

        path.classList.add(
          'region'
        );

        path.dataset.regionId =
          region.id;

        path.setAttribute(
          'd',
          region.path
        );

        path.setAttribute(
          'fill',
          region.fill
        );

        path.setAttribute(
          'stroke',
          region.stroke
        );

        path.setAttribute(
          'stroke-width',
          '1.5'
        );

        if (region.dashed) {

          path.setAttribute(
            'stroke-dasharray',
            '6 4'
          );

        }

        box.appendChild(path);


        const text =
          document.createElementNS(
            NS,
            'text'
          );

        text.classList.add(
          'region-label'
        );

        text.setAttribute(
          'x',
          region.labelX
        );

        text.setAttribute(
          'y',
          region.labelY
        );

        text.setAttribute(
          'font-size',
          region.id === 'sea'
            ? 15
            : 20
        );

        text.setAttribute(
          'opacity',
          '.55'
        );

        text.textContent =
          region.name;

        labels.appendChild(text);

      }
    );
  }


  /* =========================================================
     地图地点标识
     
     注意：
     点击地图标识时：
     只打开右侧详情。
     不调用 focusLocation()。
     不修改地图 x / y / scale。
  ========================================================= */

  function renderMarkers() {

    const g =
      document.getElementById(
        'mapMarkers'
      );

    if (!g) {
      return;
    }

    g.innerHTML = '';


    const year =
      WorldState.currentYear;


    const unlocked =
      window.WorldData.locations
        .filter(
          location =>
            isActive(
              location,
              year
            )
        )
        .length;


    window.WorldData.locations.forEach(
      loc => {

        /*
         * 当前年份：
         *   已出现 → 显示
         *
         * 未来：
         *   显示，但标记 future
         *
         * 已结束：
         *   显示，但标记 ended
         *
         * 其他情况：
         *   不显示
         */

        if (
          !isActive(loc, year) &&
          !isFuture(loc, year) &&
          !isEnded(loc, year)
        ) {
          return;
        }


        const future =
          isFuture(
            loc,
            year
          );

        const ended =
          isEnded(
            loc,
            year
          );

        const state =
          currentState(
            loc,
            year
          );


        /* -----------------------------------------------------
           外层 SVG group
        ----------------------------------------------------- */

        const group =
          document.createElementNS(
            NS,
            'g'
          );

        group.classList.add(
          'marker'
        );

        if (future) {
          group.classList.add(
            'future'
          );
        }

        if (ended) {
          group.classList.add(
            'marker-ended'
          );
        }

        group.dataset.id =
          loc.id;

        group.style.color =
          state?.color ||
          loc.color;


        /* -----------------------------------------------------
           光晕
        ----------------------------------------------------- */

        const halo =
          document.createElementNS(
            NS,
            'circle'
          );

        halo.classList.add(
          'halo'
        );

        halo.setAttribute(
          'cx',
          loc.x
        );

        halo.setAttribute(
          'cy',
          loc.y
        );

        halo.setAttribute(
          'r',
          '10'
        );

        group.appendChild(
          halo
        );


        /* -----------------------------------------------------
           已出现地点的呼吸动画
        ----------------------------------------------------- */

        if (
          !future &&
          !ended
        ) {

          const pulse =
            document.createElementNS(
              NS,
              'circle'
            );

          pulse.classList.add(
            'location-pulse'
          );

          pulse.setAttribute(
            'cx',
            loc.x
          );

          pulse.setAttribute(
            'cy',
            loc.y
          );

          pulse.setAttribute(
            'r',
            '9'
          );

          group.appendChild(
            pulse
          );
        }


        /* -----------------------------------------------------
           中心圆点
        ----------------------------------------------------- */

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
          loc.x
        );

        dot.setAttribute(
          'cy',
          loc.y
        );

        dot.setAttribute(
          'r',
          '6'
        );

        group.appendChild(
          dot
        );


        /* -----------------------------------------------------
           地点名称
        ----------------------------------------------------- */

        const text =
          document.createElementNS(
            NS,
            'text'
          );

        text.setAttribute(
          'x',
          loc.x
        );

        text.setAttribute(
          'y',
          loc.y - 14
        );

        text.textContent =
          loc.name;

        group.appendChild(
          text
        );


        /* -----------------------------------------------------
           当前状态
        ----------------------------------------------------- */

        if (state?.label) {

          const stateText =
            document.createElementNS(
              NS,
              'text'
            );

          stateText.classList.add(
            'marker-state'
          );

          stateText.setAttribute(
            'x',
            loc.x
          );

          stateText.setAttribute(
            'y',
            loc.y + 18
          );

          stateText.textContent =
            future
              ? '未开放'
              : state.label;

          group.appendChild(
            stateText
          );
        }


        /* =====================================================
           地图标识点击
           
           核心修改：
           
           不再：
             WorldMap.focusLocation(loc.id)
           
           不再：
             修改 WorldState.map.x
             修改 WorldState.map.y
             修改 WorldState.map.scale
           
           只：
             1. 打开当前地点详情
             2. 保持地图当前位置
        ===================================================== */

        group.addEventListener(
          'click',
          event => {

            event.preventDefault();
            event.stopPropagation();


            /* 未开放地点 */
            if (future) {

              showToast(
                `“${loc.name}”将在天启${WorldUtils.toCN(loc.startYear)}年开放`
              );

              return;
            }


            /*
             * 记录当前选中地点
             */
            WorldState.selectedLocationId =
              loc.id;


            /*
             * 打开右侧详情
             *
             * WorldState.select()
             * 会触发 SidebarUI 的 selection 监听。
             *
             * 注意：
             * 这里绝对不调用 focusLocation()。
             */
            WorldState.select(
              'location',
              loc.id
            );


            /*
             * 如果 state.js / sidebar.js
             * 仍然兼容旧的 openLocation 事件，
             * 保留事件即可。
             *
             * 事件本身不会改变地图位置。
             */
            WorldState.emit(
              'openLocation'
            );

          }
        );


        g.appendChild(
          group
        );

      }
    );


    /* ---------------------------------------------------------
       顶部统计
    --------------------------------------------------------- */

    document
      .getElementById(
        'statUnlocked'
      )
      ?.replaceChildren(
        document.createTextNode(
          String(unlocked)
        )
      );


    /* ---------------------------------------------------------
       资源页隐藏描述
    --------------------------------------------------------- */

    const resourceDesc =
      document.getElementById(
        'resourcePageDesc'
      );

    if (resourceDesc) {

      resourceDesc.textContent =
        `天启${WorldUtils.toCN(year)}年 · 已出现地点 ${unlocked}/${window.WorldData.locations.length} · 资源 ${window.WorldData.locations
          .filter(
            x =>
              isActive(
                x,
                year
              )
          )
          .reduce(
            (total, x) =>
              total +
              (x.res?.length || 0),
            0
          )} 项`;
    }
  }


  /* =========================================================
     应用地图变换
  ========================================================= */

  function applyTransform() {

    const map =
      WorldState.map;

    const viewport =
      document.getElementById(
        'mapViewport'
      );

    if (!viewport) {
      return;
    }

    viewport.style.transform =
      `translate(${map.x}px,${map.y}px) scale(${map.scale})`;
  }


  /* =========================================================
     地图适配屏幕
     
     只在：
     - 初始化
     - 浏览器窗口 resize
     - 用户点击“重置”
     
     时调用。
  ========================================================= */

  function fitToScreen() {

    const bg =
      document.getElementById(
        'mapBg'
      );

    if (!bg) {
      return;
    }


    const scale =
      Math.min(
        bg.clientWidth / VIEW_W,
        bg.clientHeight / VIEW_H
      );


    WorldState.map.scale =
      scale;

    WorldState.map.x =
      (
        bg.clientWidth -
        VIEW_W * scale
      ) / 2;

    WorldState.map.y =
      (
        bg.clientHeight -
        VIEW_H * scale
      ) / 2;


    applyTransform();
  }


  /* =========================================================
     指定位置缩放
  ========================================================= */

  function zoomAtPoint(
    factor,
    px,
    py
  ) {

    const map =
      WorldState.map;

    const oldScale =
      map.scale;

    const newScale =
      WorldUtils.clamp(
        oldScale * factor,
        map.minScale,
        map.maxScale
      );


    if (
      newScale === oldScale
    ) {
      return;
    }


    const mapX =
      (px - map.x) /
      oldScale;

    const mapY =
      (py - map.y) /
      oldScale;


    map.scale =
      newScale;

    map.x =
      px -
      mapX * newScale;

    map.y =
      py -
      mapY * newScale;


    applyTransform();
  }


  /* =========================================================
     屏幕中心缩放
  ========================================================= */

  function zoomCenter(
    factor
  ) {

    const bg =
      document.getElementById(
        'mapBg'
      );

    if (!bg) {
      return;
    }


    zoomAtPoint(
      factor,
      bg.clientWidth / 2,
      bg.clientHeight / 2
    );
  }


  /* =========================================================
     地图初始化
  ========================================================= */

  function init() {

    renderRegions();

    renderMarkers();

    fitToScreen();


    const bg =
      document.getElementById(
        'mapBg'
      );

    if (!bg) {
      return;
    }


    /* -------------------------------------------------------
       地图拖动
    ------------------------------------------------------- */

    bg.addEventListener(
      'pointerdown',
      event => {

        /*
         * 点击地图标识时，
         * 不启动地图拖动。
         */
        if (
          event.target.closest(
            '.marker'
          )
        ) {
          return;
        }


        if (
          event.pointerType === 'mouse' &&
          event.button !== 0
        ) {
          return;
        }


        isDragging =
          true;

        dragStartX =
          event.clientX;

        dragStartY =
          event.clientY;

        startX =
          WorldState.map.x;

        startY =
          WorldState.map.y;


        bg.classList.add(
          'dragging'
        );


        bg.setPointerCapture?.(
          event.pointerId
        );

      }
    );


    /* -------------------------------------------------------
       地图拖动过程
    ------------------------------------------------------- */

    bg.addEventListener(
      'pointermove',
      event => {

        if (!isDragging) {
          return;
        }


        WorldState.map.x =
          startX +
          event.clientX -
          dragStartX;

        WorldState.map.y =
          startY +
          event.clientY -
          dragStartY;


        applyTransform();
      }
    );


    /* -------------------------------------------------------
       停止拖动
    ------------------------------------------------------- */

    const stopDragging =
      () => {

        isDragging =
          false;

        bg.classList.remove(
          'dragging'
        );
      };


    bg.addEventListener(
      'pointerup',
      stopDragging
    );

    bg.addEventListener(
      'pointercancel',
      stopDragging
    );


    /* -------------------------------------------------------
       滚轮缩放
    ------------------------------------------------------- */

    bg.addEventListener(
      'wheel',
      event => {

        event.preventDefault();


        const rect =
          bg.getBoundingClientRect();


        zoomAtPoint(
          event.deltaY > 0
            ? 0.9
            : 1.1,

          event.clientX -
            rect.left,

          event.clientY -
            rect.top
        );

      },
      {
        passive: false
      }
    );


    /* -------------------------------------------------------
       顶部工具栏
    ------------------------------------------------------- */

    const zoomInBtn =
      document.getElementById(
        'zoomInBtn'
      );

    if (zoomInBtn) {

      zoomInBtn.addEventListener(
        'click',
        () => zoomCenter(1.25)
      );

    }


    const zoomOutBtn =
      document.getElementById(
        'zoomOutBtn'
      );

    if (zoomOutBtn) {

      zoomOutBtn.addEventListener(
        'click',
        () => zoomCenter(
          1 / 1.25
        )
      );

    }


    const resetViewBtn =
      document.getElementById(
        'resetViewBtn'
      );

    if (resetViewBtn) {

      resetViewBtn.addEventListener(
        'click',
        fitToScreen
      );

    }


    /* -------------------------------------------------------
       窗口大小改变
       
       注意：
       这里会重新适配地图。
       点击地图标识不会触发 resize。
    ------------------------------------------------------- */

    window.addEventListener(
      'resize',
      fitToScreen
    );


    /* -------------------------------------------------------
       时间轴变化
    ------------------------------------------------------- */

    WorldState.on(
      reason => {

        if (
          reason === 'year'
        ) {

          renderMarkers();

        }

      }
    );
  }


  /* =========================================================
     主动定位地点
     
     注意：
     这个函数仍然保留，
     但“点击地图标识”不会调用它。
     
     后续如果你需要：
       - 搜索地点并定位
       - 点击某个外部导航自动定位
       - “前往地点”按钮
     
     可以单独调用：
     
       WorldMap.focusLocation('m1')
  ========================================================= */

  function focusLocation(
    id
  ) {

    const loc =
      window.WorldData.locations.find(
        x =>
          x.id === id
      );

    if (!loc) {
      return;
    }


    const bg =
      document.getElementById(
        'mapBg'
      );

    if (!bg) {
      return;
    }


    const targetScale =
      1.45;


    WorldState.map.scale =
      targetScale;

    WorldState.map.x =
      bg.clientWidth / 2 -
      loc.x * targetScale;

    WorldState.map.y =
      bg.clientHeight / 2 -
      loc.y * targetScale;


    applyTransform();


    /*
     * 临时高亮定位地点
     */
    document
      .querySelectorAll(
        '.marker'
      )
      .forEach(
        marker =>
          marker.classList.remove(
            'map-highlight'
          )
      );


    const marker =
      document.querySelector(
        `.marker[data-id="${id}"]`
      );


    marker?.classList.add(
      'map-highlight'
    );


    setTimeout(
      () => {

        marker?.classList.remove(
          'map-highlight'
        );

      },
      2200
    );
  }


  /* =========================================================
     对外接口
  ========================================================= */

  return {

    init,

    renderMarkers,

    fitToScreen,

    zoomCenter,

    /*
     * 保留主动定位接口，
     * 但地图标识点击不会自动调用。
     */
    focusLocation,

    isActive,

    isFuture,

    isEnded,

    currentState

  };

})();
