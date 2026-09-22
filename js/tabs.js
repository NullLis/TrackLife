window.TabsUI = (() => {
  const descriptions = {
    map:
      '时间轴驱动的世界状态 · 地图地点 · 区域 · 当前纪年',

    resource:
      '按出现时间浏览地点与资源，点击卡片查看右侧档案。',

    faction:
      '点击势力节点查看当前年份的关系、领地与事件。',

    relation:
      '点击人物节点查看当前年份的关系、地点与事件。'
  };

  function updateTopbar(tab) {
    document.body.dataset.tab = tab;

    const titleMap = {
      map: '世界地图',
      resource: '地点资源',
      faction: '势力关系',
      relation: '人物关系'
    };

    const title =
      document.getElementById(
        'topbarTitle'
      );

    if (title) {
      title.textContent =
        titleMap[tab] ||
        '世界地图';
    }

    const desc =
      document.getElementById(
        'topbarDesc'
      );

    if (desc) {
      desc.textContent =
        descriptions[tab] ||
        descriptions.map;
    }
  }

  function setTab(tab) {
    WorldState.currentTab =
      tab;

    /*
     * 更新左侧导航。
     */
    document
      .querySelectorAll(
        '.info-tab'
      )
      .forEach(tabButton => {
        tabButton.classList.toggle(
          'active',
          tabButton.dataset.tab ===
            tab
        );
      });

    /*
     * 更新全屏信息页。
     */
    document
      .querySelectorAll(
        '.info-view-page'
      )
      .forEach(page => {
        page.classList.toggle(
          'active',
          page.id ===
            `iv-${tab}`
        );
      });

    /*
     * 地图模式不显示全屏信息层。
     */
    const infoView =
      document.getElementById(
        'infoView'
      );

    if (infoView) {
      infoView.classList.toggle(
        'show',
        tab !== 'map'
      );

      infoView.setAttribute(
        'aria-hidden',
        tab === 'map'
          ? 'true'
          : 'false'
      );
    }

    document.body.classList.toggle(
      'info-open',
      tab !== 'map'
    );

    /*
     * 地图图例只在世界地图页面显示。
     */
    const mapLegend =
      document.getElementById(
        'mapLegend'
      );

    if (mapLegend) {
      mapLegend.classList.toggle(
        'hidden',
        tab !== 'map'
      );
    }

    updateTopbar(tab);

    /*
     * 切换一级页面时关闭已有的右侧详情。
     *
     * 注意：
     *
     * 资源卡片点击时不会调用 setTab('map')，
     * 所以资源页中的右侧详情不会被关闭。
     */
    SidebarUI.close();

    /*
     * 进入地点资源页面时刷新资源列表。
     */
    if (tab === 'resource') {
      renderResources();
    }
  }

  function renderResources() {
    const grid =
      document.getElementById(
        'resourceGrid'
      );

    if (!grid) {
      return;
    }

    const showActiveOnly =
      WorldState.resourceFilter ===
      'active';

    const year =
      WorldState.currentYear;

    const locations =
      WorldData.locations.filter(
        location =>
          !showActiveOnly ||
          WorldMap.isActive(
            location,
            year
          )
      );

    if (!locations.length) {
      grid.innerHTML = `
        <div class="content-page-empty">
          当前时间线没有符合条件的地点。
        </div>
      `;

      return;
    }

    grid.innerHTML =
      locations
        .map(
          location => `
            <button
              class="resource-card"
              data-resource-id="${location.id}"
              type="button">

              <div class="resource-card-head">

                <span
                  class="resource-card-dot"
                  style="
                    background:${location.color};
                    box-shadow:0 0 8px ${WorldUtils.hexA(
                      location.color,
                      0.65
                    )};
                  ">
                </span>

                <span class="resource-card-name">
                  ${WorldUtils.escapeHtml(
                    location.name
                  )}
                </span>

                <span
                  class="resource-card-type"
                  style="
                    color:${location.color};
                    border-color:${WorldUtils.hexA(
                      location.color,
                      0.3
                    )};
                    background:${WorldUtils.hexA(
                      location.color,
                      0.1
                    )};
                  ">
                  ${WorldUtils.escapeHtml(
                    location.type
                  )}
                </span>

              </div>

              <div class="resource-card-year">
                ${WorldUtils.escapeHtml(
                  location.region
                )}
                ·
                天启${WorldUtils.toCN(
                  location.startYear
                )}年开放
              </div>

              <div class="resource-card-tags">

                ${(location.res || [])
                  .map(
                    resource => `
                      <span class="resource-card-tag">
                        ${WorldUtils.escapeHtml(
                          resource
                        )}
                      </span>
                    `
                  )
                  .join('')}

              </div>

            </button>
          `
        )
        .join('');

    /*
     * 地点资源卡片点击。
     *
     * 旧逻辑：
     *
     * setTab('map')
     * WorldState.select(...)
     * WorldMap.focusLocation(...)
     *
     * 会跳回世界地图。
     *
     * 新逻辑：
     *
     * 保持当前 resource 页面，
     * 只打开右侧详情。
     */
    grid
      .querySelectorAll(
        '[data-resource-id]'
      )
      .forEach(card => {
        card.addEventListener(
          'click',
          event => {
            event.preventDefault();

            /*
             * 阻止点击继续向外传播。
             */
            event.stopPropagation();

            const locationId =
              card.dataset.resourceId;

            if (!locationId) {
              return;
            }

            /*
             * 只选择地点。
             *
             * SidebarUI 会监听 selection，
             * 自动在当前地点资源页面右侧
             * 打开详情。
             */
            WorldState.select(
              'location',
              locationId
            );
          }
        );
      });
  }

  function init() {
    /*
     * 一级导航。
     */
    document
      .querySelectorAll(
        '.info-tab'
      )
      .forEach(tabButton => {
        tabButton.addEventListener(
          'click',
          event => {
            event.preventDefault();
            event.stopPropagation();

            const tab =
              tabButton.dataset.tab;

            if (!tab) {
              return;
            }

            setTab(tab);
          }
        );
      });

    /*
     * 左侧导航收起/展开。
     */
    const tabsToggle =
      document.getElementById(
        'tabsToggle'
      );

    if (tabsToggle) {
      tabsToggle.addEventListener(
        'click',
        event => {
          event.preventDefault();
          event.stopPropagation();

          WorldState.tabsCollapsed =
            !WorldState.tabsCollapsed;

          const wrapper =
            document.getElementById(
              'tabsWrapper'
            );

          if (wrapper) {
            wrapper.classList.toggle(
              'collapsed',
              WorldState.tabsCollapsed
            );
          }
        }
      );
    }

    /*
     * 返回世界地图。
     */
    const backMap =
      document.getElementById(
        'btnBackMap'
      );

    if (backMap) {
      backMap.addEventListener(
        'click',
        event => {
          event.preventDefault();
          event.stopPropagation();

          setTab('map');
        }
      );
    }

    /*
     * 资源筛选按钮。
     */
    document
      .querySelectorAll(
        '[data-resource-filter]'
      )
      .forEach(button => {
        button.addEventListener(
          'click',
          event => {
            event.preventDefault();
            event.stopPropagation();

            WorldState.resourceFilter =
              button.dataset.resourceFilter;

            document
              .querySelectorAll(
                '[data-resource-filter]'
              )
              .forEach(item => {
                item.classList.toggle(
                  'active',
                  item === button
                );
              });

            renderResources();
          }
        );
      });

    /*
     * 时间轴变化时，
     * 如果当前正在地点资源页面，
     * 刷新资源列表。
     *
     * 右侧已选地点仍由 SidebarUI
     * 根据 WorldState 重新渲染。
     */
    WorldState.on(
      reason => {
        if (
          reason === 'year' &&
          WorldState.currentTab ===
            'resource'
        ) {
          renderResources();
        }
      }
    );

    /*
     * 初始顶部信息。
     */
    updateTopbar('map');
  }

  return {
    init,
    setTab,
    renderResources,
    updateTopbar
  };
})();
