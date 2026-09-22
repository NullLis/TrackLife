window.WorldMap = (() => {
  const NS = WorldUtils.svgNS;

  const VIEW_W = 1600;
  const VIEW_H = 1013;

  let isDragging = false;

  let dragStartX = 0;
  let dragStartY = 0;

  let startX = 0;
  let startY = 0;

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
        state =>
          year >= state.from &&
          year <= state.to
      ) ||
      states
        .filter(
          state =>
            year >= state.from
        )
        .sort(
          (a, b) =>
            b.from - a.from
        )[0] ||
      null
    );
  }

  /*
   * 根据 WorldState.selectedEntity
   * 同步地图地点的选中状态。
   */
  function syncSelectionVisuals() {
    document
      .querySelectorAll(
        '.marker.selected'
      )
      .forEach(marker => {
        marker.classList.remove(
          'selected'
        );
      });

    const selected =
      WorldState.selectedEntity;

    if (!selected) {
      return;
    }

    /*
     * 地图目前只处理地点选中。
     */
    if (
      selected.type !== 'location'
    ) {
      return;
    }

    const marker =
      document.querySelector(
        `.marker[data-id="${selected.id}"]`
      );

    if (marker) {
      marker.classList.add(
        'selected'
      );
    }
  }

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

  function renderMarkers() {
    const group =
      document.getElementById(
        'mapMarkers'
      );

    if (!group) {
      return;
    }

    group.innerHTML = '';

    const year =
      WorldState.currentYear;

    const unlocked =
      window.WorldData.locations.filter(
        location =>
          isActive(
            location,
            year
          )
      ).length;

    window.WorldData.locations.forEach(
      location => {
        const future =
          isFuture(
            location,
            year
          );

        const ended =
          isEnded(
            location,
            year
          );

        /*
         * 过滤异常状态。
         */
        if (
          !isActive(
            location,
            year
          ) &&
          !future &&
          !ended
        ) {
          return;
        }

        const state =
          currentState(
            location,
            year
          );

        const marker =
          document.createElementNS(
            NS,
            'g'
          );

        marker.classList.add(
          'marker'
        );

        if (future) {
          marker.classList.add(
            'future'
          );
        }

        if (ended) {
          marker.classList.add(
            'marker-ended'
          );
        }

        marker.dataset.id =
          location.id;

        marker.style.color =
          state?.color ||
          location.color;

        /*
         * 光晕。
         */
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
          location.x
        );

        halo.setAttribute(
          'cy',
          location.y
        );

        halo.setAttribute(
          'r',
          '10'
        );

        marker.appendChild(
          halo
        );

        /*
         * 活跃地点脉冲。
         */
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
            location.x
          );

          pulse.setAttribute(
            'cy',
            location.y
          );

          pulse.setAttribute(
            'r',
            '9'
          );

          marker.appendChild(
            pulse
          );
        }

        /*
         * 地点主点。
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
          location.x
        );

        dot.setAttribute(
          'cy',
          location.y
        );

        dot.setAttribute(
          'r',
          '6'
        );

        marker.appendChild(
          dot
        );

        /*
         * 地点名称。
         */
        const text =
          document.createElementNS(
            NS,
            'text'
          );

        text.setAttribute(
          'x',
          location.x
        );

        text.setAttribute(
          'y',
          location.y - 14
        );

        text.textContent =
          location.name;

        marker.appendChild(
          text
        );

        /*
         * 当前地点状态。
         */
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
            location.x
          );

          stateText.setAttribute(
            'y',
            location.y + 18
          );

          stateText.textContent =
            future
              ? '未开放'
              : state.label;

          marker.appendChild(
            stateText
          );
        }

        /*
         * 地图地点点击。
         */
        marker.addEventListener(
          'click',
          event => {
            event.stopPropagation();

            if (future) {
              showToast(
                `“${location.name}”将在天启${WorldUtils.toCN(location.startYear)}年开放`
              );

              return;
            }

            /*
             * 所有选中状态统一交给 WorldState。
             */
            WorldState.select(
              'location',
              location.id
            );

            /*
             * 点击后将地点移动到地图中心。
             */
            focusLocation(
              location.id
            );
          }
        );

        group.appendChild(
          marker
        );
      }
    );

    /*
     * 更新统计。
     */
    const statUnlocked =
      document.getElementById(
        'statUnlocked'
      );

    if (statUnlocked) {
      statUnlocked.replaceChildren(
        document.createTextNode(
          String(unlocked)
        )
      );
    }

    /*
     * 更新资源页描述。
     */
    const resourceDesc =
      document.getElementById(
        'resourcePageDesc'
      );

    if (resourceDesc) {
      const resourceCount =
        window.WorldData.locations
          .filter(
            location =>
              isActive(
                location,
                year
              )
          )
          .reduce(
            (count, location) =>
              count +
              (
                location.res || []
              ).length,
            0
          );

      resourceDesc.textContent =
        `天启${WorldUtils.toCN(year)}年 · 已出现地点 ${unlocked}/${window.WorldData.locations.length} · 资源 ${resourceCount} 项`;
    }

    /*
     * 渲染完成后同步选中状态。
     */
    syncSelectionVisuals();
  }

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

    const mx =
      (px - map.x) /
      oldScale;

    const my =
      (py - map.y) /
      oldScale;

    map.scale =
      newScale;

    map.x =
      px -
      mx * newScale;

    map.y =
      py -
      my * newScale;

    applyTransform();
  }

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

    /*
     * 地图拖拽。
     */
    bg.addEventListener(
      'pointerdown',
      event => {
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

        isDragging = true;

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

    const stopDragging = () => {
      isDragging = false;

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

    /*
     * 鼠标滚轮缩放。
     */
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

    /*
     * 放大。
     */
    const zoomIn =
      document.getElementById(
        'zoomInBtn'
      );

    if (zoomIn) {
      zoomIn.addEventListener(
        'click',
        () => {
          zoomCenter(1.25);
        }
      );
    }

    /*
     * 缩小。
     */
    const zoomOut =
      document.getElementById(
        'zoomOutBtn'
      );

    if (zoomOut) {
      zoomOut.addEventListener(
        'click',
        () => {
          zoomCenter(
            1 / 1.25
          );
        }
      );
    }

    /*
     * 重置。
     */
    const reset =
      document.getElementById(
        'resetViewBtn'
      );

    if (reset) {
      reset.addEventListener(
        'click',
        fitToScreen
      );
    }

    window.addEventListener(
      'resize',
      fitToScreen
    );

    /*
     * 时间轴改变。
     */
    WorldState.on(
      reason => {
        if (
          reason === 'year'
        ) {
          renderMarkers();

          return;
        }

        /*
         * 选中状态变化。
         */
        if (
          reason === 'selection' ||
          reason ===
            'selectionClear'
        ) {
          syncSelectionVisuals();
        }
      }
    );
  }

  function focusLocation(id) {
    const location =
      window.WorldData.locations.find(
        item =>
          item.id === id
      );

    if (!location) {
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
      location.x *
        targetScale;

    WorldState.map.y =
      bg.clientHeight / 2 -
      location.y *
        targetScale;

    applyTransform();

    /*
     * 移除旧高亮。
     */
    document
      .querySelectorAll(
        '.marker.map-highlight'
      )
      .forEach(marker => {
        marker.classList.remove(
          'map-highlight'
        );
      });

    const marker =
      document.querySelector(
        `.marker[data-id="${id}"]`
      );

    if (marker) {
      marker.classList.add(
        'map-highlight'
      );

      setTimeout(() => {
        marker.classList.remove(
          'map-highlight'
        );
      }, 2200);
    }
  }

  return {
    init,
    renderMarkers,
    fitToScreen,
    zoomCenter,
    focusLocation,
    isActive,
    isFuture,
    isEnded,
    currentState,
    syncSelectionVisuals
  };
})();
