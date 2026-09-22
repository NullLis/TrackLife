window.SidebarUI = (() => {
  const sidebar = () => document.getElementById('mapSidebar');
  const content = () => document.getElementById('sidebarContent');

  function open() {
    const el = sidebar();
    if (!el) return;

    el.classList.add('open');
    el.classList.remove('collapsed');
  }

  function close() {
    const el = sidebar();
    if (!el) return;

    el.classList.remove('open');
    el.classList.add('collapsed');

    WorldState.selectedEntity = null;

    document.querySelectorAll('.selected').forEach(x => {
      x.classList.remove('selected');
    });
  }

  function stateFor(item) {
    return WorldMap.currentState(item, WorldState.currentYear);
  }

  function entity(type, id) {
    if (type === 'location') {
      return WorldData.locations.find(x => x.id === id);
    }

    if (type === 'faction') {
      return WorldData.factions.find(x => x.id === id);
    }

    if (type === 'character') {
      return WorldData.characters.find(x => x.id === id);
    }

    if (type === 'event') {
      return WorldData.events.find(x => x.id === id);
    }

    return null;
  }

  function relatedLocationIdsForEntity(type, item) {
    if (type === 'faction') {
      return item.territory || [];
    }

    if (type === 'character') {
      return item.locationIds || [];
    }

    return [];
  }

  function renderSelected() {
    const sel = WorldState.selectedEntity;

    if (!sel) {
      renderWorldOverview();
      return;
    }

    const item = entity(sel.type, sel.id);

    if (!item) {
      renderWorldOverview();
      return;
    }

    open();

    if (sel.type === 'location') {
      renderLocation(item);
    }

    if (sel.type === 'faction') {
      renderFaction(item);
    }

    if (sel.type === 'character') {
      renderCharacter(item);
    }

    if (sel.type === 'event') {
      renderEvent(item);
    }
  }

  function tabs(type) {
    const maps = {
      location: [
        ['overview', '概览'],
        ['resources', '资源'],
        ['relations', '关系'],
        ['events', '事件']
      ],

      faction: [
        ['overview', '概览'],
        ['relations', '关系'],
        ['territory', '领地'],
        ['events', '事件']
      ],

      character: [
        ['overview', '概览'],
        ['relations', '关系'],
        ['locations', '地点'],
        ['events', '事件']
      ],

      event: [
        ['overview', '概览'],
        ['locations', '地点'],
        ['characters', '人物'],
        ['factions', '势力']
      ]
    };

    const list = maps[type] || [];

    return `
      <div class="detail-tabs">
        ${list
          .map(
            ([id, label]) => `
              <button
                class="detail-tab ${WorldState.detailSubTab === id ? 'active' : ''}"
                data-detail-tab="${id}">
                ${label}
              </button>
            `
          )
          .join('')}
      </div>
    `;
  }

  function header(item, type, badgeColor, label) {
    const status = WorldMap.currentState(
      item,
      WorldState.currentYear
    );

    return `
      <div class="content-page-top">

        <div class="content-page-kicker">
          ${type.toUpperCase()} PROFILE / ${item.id.toUpperCase()}
        </div>

        <div class="content-page-head">

          <div>
            <div class="content-page-title">
              ${WorldUtils.escapeHtml(item.name)}
            </div>

            <div class="content-page-subtitle">
              天启${WorldUtils.toCN(WorldState.currentYear)}年 ·
              ${WorldUtils.escapeHtml(
                status?.label ||
                item.role ||
                item.region ||
                '世界档案'
              )}
            </div>
          </div>

          <div
            class="content-page-badge"
            style="
              color:${badgeColor};
              border-color:${WorldUtils.hexA(badgeColor, 0.35)};
              background:${WorldUtils.hexA(badgeColor, 0.08)}
            ">
            ${label}
          </div>

        </div>
      </div>
    `;
  }

  function overview(item, type) {
    const stats = item.stats || {};

    const cards = Object.entries(stats)
      .slice(0, 4)
      .map(
        ([k, v]) => `
          <div class="content-page-card">
            <div class="content-page-card-label">
              ${WorldUtils.escapeHtml(k)}
            </div>

            <div class="content-page-card-value">
              ${WorldUtils.escapeHtml(v)}
            </div>
          </div>
        `
      )
      .join('');

    const currentState = WorldMap.currentState(
      item,
      WorldState.currentYear
    );

    return `
      <div class="content-page-section">

        <div class="content-page-section-title">
          当前状态
        </div>

        <div
          class="state-badge"
          style="
            color:${currentState?.color || 'var(--gold)'};
          ">

          <span class="state-dot"></span>

          ${WorldUtils.escapeHtml(
            currentState?.label || '当前状态'
          )}

        </div>
      </div>

      <div class="content-page-section">

        <div class="content-page-section-title">
          档案摘要
        </div>

        <div class="content-page-intro">
          ${WorldUtils.escapeHtml(
            item.desc || '暂无描述。'
          )}
        </div>

      </div>

      ${
        cards
          ? `
            <div class="content-page-section">

              <div class="content-page-section-title">
                核心档案
              </div>

              <div class="content-page-grid">
                ${cards}
              </div>

            </div>
          `
          : ''
      }
    `;
  }

  function renderShell(
    item,
    type,
    badgeColor,
    label
  ) {
    content().innerHTML = `
      <div class="content-page">

        ${header(
          item,
          type,
          badgeColor,
          label
        )}

        ${tabs(type)}

        <div
          class="content-page-body"
          id="detailBody">
        </div>

      </div>
    `;

    wireTabs();

    return document.getElementById('detailBody');
  }

  function wireTabs() {
    document
      .querySelectorAll('.detail-tab')
      .forEach(btn => {
        btn.addEventListener('click', () => {
          WorldState.detailSubTab =
            btn.dataset.detailTab;

          renderSelected();
        });
      });
  }

  function renderLocation(loc) {
    const body = renderShell(
      loc,
      'location',
      loc.color,
      loc.type
    );

    const sub = WorldState.detailSubTab;

    if (sub === 'overview') {
      body.innerHTML =
        overview(loc, 'location') +
        `
          <div class="content-page-section">

            <div class="content-page-section-title">
              首次出现
            </div>

            <div class="content-page-card">

              <div class="content-page-card-label">
                进入世界
              </div>

              <div class="content-page-card-value">
                天启${WorldUtils.toCN(loc.startYear)}年
              </div>

            </div>

          </div>
        `;
    }

    if (sub === 'resources') {
      body.innerHTML = `
        <div class="content-page-section">

          <div class="content-page-section-title">
            资源清单
          </div>

          <div class="content-page-list">

            ${loc.res
              .map(
                x => `
                  <span class="content-page-chip">
                    ${WorldUtils.escapeHtml(x)}
                  </span>
                `
              )
              .join('')}

          </div>

        </div>
      `;
    }

    if (sub === 'relations') {
      body.innerHTML = locationRelations(loc);
    }

    if (sub === 'events') {
      body.innerHTML = eventsFor(
        'location',
        loc.id
      );
    }

    body.scrollTop = 0;
  }

  function locationRelations(loc) {
    const faction = loc.factionId
      ? WorldData.factions.find(
          x => x.id === loc.factionId
        )
      : null;

    const chars = WorldData.characters.filter(
      x => (x.locationIds || []).includes(loc.id)
    );

    return `
      <div class="content-page-section">

        <div class="content-page-section-title">
          所属势力
        </div>

        ${
          faction
            ? `
              <button
                class="content-page-chip"
                data-nav-type="faction"
                data-nav-id="${faction.id}">
                ${WorldUtils.escapeHtml(faction.name)}
              </button>
            `
            : `
              <div class="content-page-empty">
                无固定所属势力
              </div>
            `
        }

      </div>

      <div class="content-page-section">

        <div class="content-page-section-title">
          相关人物
        </div>

        <div class="content-page-list">

          ${
            chars
              .map(
                c => `
                  <button
                    class="content-page-chip"
                    data-nav-type="character"
                    data-nav-id="${c.id}">
                    ${WorldUtils.escapeHtml(c.name)}
                  </button>
                `
              )
              .join('') ||
            `
              <span class="content-page-chip">
                暂无人物
              </span>
            `
          }

        </div>

      </div>
    `;
  }

  function renderFaction(f) {
    const body = renderShell(
      f,
      'faction',
      f.color,
      '势力'
    );

    const sub = WorldState.detailSubTab;

    if (sub === 'overview') {
      body.innerHTML =
        overview(f, 'faction') +
        `
          <div class="content-page-section">

            <div class="content-page-section-title">
              阵营
            </div>

            <div class="content-page-list">

              <span
                class="content-page-chip"
                style="color:${f.color}">
                ${WorldUtils.escapeHtml(f.category)}
              </span>

              <span class="content-page-chip">
                ${WorldUtils.escapeHtml(f.role)}
              </span>

            </div>

          </div>
        `;
    }

    if (sub === 'relations') {
      body.innerHTML = factionRelations(f);
    }

    if (sub === 'territory') {
      body.innerHTML = territory(f);
    }

    if (sub === 'events') {
      body.innerHTML = eventsFor(
        'faction',
        f.id
      );
    }

    body.scrollTop = 0;
  }

  function factionRelations(f) {
    const edges =
      WorldData.factionRelations.filter(
        x =>
          (x.from === f.id || x.to === f.id) &&
          WorldMap.isActive(
            x,
            WorldState.currentYear
          )
      );

    return `
      <div class="content-page-section">

        <div class="content-page-section-title">
          当前关系
        </div>

        ${
          edges
            .map(e => {
              const id =
                e.from === f.id
                  ? e.to
                  : e.from;

              const other =
                WorldData.factions.find(
                  x => x.id === id
                );

              return `
                <div class="content-page-stat-row">

                  <span class="content-page-stat-key">
                    ${WorldUtils.escapeHtml(
                      other?.name || id
                    )}
                  </span>

                  <span
                    class="content-page-stat-value"
                    style="
                      color:${e.color || 'var(--gold)'};
                    ">
                    ${WorldUtils.escapeHtml(e.label)}
                  </span>

                </div>
              `;
            })
            .join('') ||
          `
            <div class="content-page-empty">
              当前没有生效关系。
            </div>
          `
        }

      </div>
    `;
  }

  function territory(f) {
    const locs =
      WorldData.locations.filter(
        x =>
          (f.territory || []).includes(x.id) &&
          WorldMap.isActive(
            x,
            WorldState.currentYear
          )
      );

    return `
      <div class="content-page-section">

        <div class="content-page-section-title">
          当前领地
        </div>

        <div class="content-page-list">

          ${
            locs
              .map(
                l => `
                  <button
                    class="content-page-chip"
                    data-nav-type="location"
                    data-nav-id="${l.id}">
                    ${WorldUtils.escapeHtml(l.name)}
                  </button>
                `
              )
              .join('') ||
            `
              <span class="content-page-chip">
                当前无已解锁领地
              </span>
            `
          }

        </div>

      </div>
    `;
  }

  function renderCharacter(c) {
    const body = renderShell(
      c,
      'character',
      c.color,
      '人物'
    );

    const sub = WorldState.detailSubTab;

    if (sub === 'overview') {
      body.innerHTML = overview(
        c,
        'character'
      );
    }

    if (sub === 'relations') {
      body.innerHTML = characterRelations(c);
    }

    if (sub === 'locations') {
      body.innerHTML = `
        <div class="content-page-section">

          <div class="content-page-section-title">
            相关地点
          </div>

          <div class="content-page-list">

            ${
              (c.locationIds || [])
                .map(id =>
                  WorldData.locations.find(
                    x => x.id === id
                  )
                )
                .filter(Boolean)
                .filter(
                  x =>
                    x.startYear <=
                    WorldState.currentYear
                )
                .map(
                  l => `
                    <button
                      class="content-page-chip"
                      data-nav-type="location"
                      data-nav-id="${l.id}">
                      ${WorldUtils.escapeHtml(l.name)}
                    </button>
                  `
                )
                .join('') ||
              `
                <span class="content-page-chip">
                  当前没有已解锁地点
                </span>
              `
            }

          </div>

        </div>
      `;
    }

    if (sub === 'events') {
      body.innerHTML = eventsFor(
        'character',
        c.id
      );
    }

    body.scrollTop = 0;
  }

  function characterRelations(c) {
    /*
     * 修复原来的运算符优先级问题：
     *
     * 原来：
     * x.from===c.id || x.to===c.id && isActive(...)
     *
     * 实际等价于：
     * x.from===c.id || (x.to===c.id && isActive(...))
     *
     * 正确逻辑应该是：
     * (x.from===c.id || x.to===c.id) && isActive(...)
     */
    const activeEdges =
      WorldData.characterRelations.filter(
        x =>
          (x.from === c.id ||
            x.to === c.id) &&
          WorldMap.isActive(
            x,
            WorldState.currentYear
          )
      );

    return `
      <div class="content-page-section">

        <div class="content-page-section-title">
          当前关系
        </div>

        ${
          activeEdges
            .map(e => {
              const id =
                e.from === c.id
                  ? e.to
                  : e.from;

              const o =
                WorldData.characters.find(
                  x => x.id === id
                );

              return `
                <div class="content-page-stat-row">

                  <span class="content-page-stat-key">
                    ${WorldUtils.escapeHtml(
                      o?.name || id
                    )}
                  </span>

                  <span
                    class="content-page-stat-value"
                    style="
                      color:${e.color || 'var(--gold)'};
                    ">
                    ${WorldUtils.escapeHtml(e.label)}
                  </span>

                </div>
              `;
            })
            .join('') ||
          `
            <div class="content-page-empty">
              当前没有生效关系。
            </div>
          `
        }

      </div>
    `;
  }

  function eventsFor(type, id) {
    const items =
      WorldData.events.filter(e => {
        const key =
          type === 'location'
            ? 'locationIds'
            : type === 'faction'
              ? 'factionIds'
              : 'characterIds';

        return (e[key] || []).includes(id);
      });

    return `
      <div class="content-page-section">

        <div class="content-page-section-title">
          相关事件
        </div>

        ${
          items
            .map(
              e => `
                <div
                  class="content-page-event"
                  data-event-id="${e.id}"
                  style="
                    border-color:${WorldUtils.hexA(
                      e.color,
                      0.45
                    )};
                  ">

                  <div
                    class="content-page-event-name"
                    style="color:${e.color}">
                    ${WorldUtils.escapeHtml(e.name)}
                  </div>

                  <div class="content-page-event-time">
                    天启${WorldUtils.toCN(e.start)}年
                    —
                    天启${WorldUtils.toCN(e.end)}年
                    ·
                    ${
                      e.start <=
                        WorldState.currentYear &&
                      e.end >=
                        WorldState.currentYear
                        ? '进行中'
                        : e.start >
                            WorldState.currentYear
                          ? '未发生'
                          : '已结束'
                    }
                  </div>

                  <div class="content-page-event-desc">
                    ${WorldUtils.escapeHtml(e.desc)}
                  </div>

                </div>
              `
            )
            .join('') ||
          `
            <div class="content-page-empty">
              暂无关联事件。
            </div>
          `
        }

      </div>
    `;
  }

  function renderEvent(e) {
    const body = renderShell(
      e,
      'event',
      e.color,
      '历史事件'
    );

    const sub = WorldState.detailSubTab;

    if (sub === 'overview') {
      body.innerHTML = `
        <div class="content-page-section">

          <div class="content-page-section-title">
            事件概述
          </div>

          <div class="content-page-intro">
            ${WorldUtils.escapeHtml(e.desc)}
          </div>

        </div>

        <div class="content-page-section">

          <div class="content-page-grid">

            <div class="content-page-card">

              <div class="content-page-card-label">
                开始
              </div>

              <div class="content-page-card-value">
                天启${WorldUtils.toCN(e.start)}年
              </div>

            </div>

            <div class="content-page-card">

              <div class="content-page-card-label">
                结束
              </div>

              <div class="content-page-card-value">
                天启${WorldUtils.toCN(e.end)}年
              </div>

            </div>

          </div>

        </div>
      `;
    }

    if (sub === 'locations') {
      body.innerHTML = entityLinks(
        e.locationIds,
        'location',
        '相关地点'
      );
    }

    if (sub === 'characters') {
      body.innerHTML = entityLinks(
        e.characterIds,
        'character',
        '相关人物'
      );
    }

    if (sub === 'factions') {
      body.innerHTML = entityLinks(
        e.factionIds,
        'faction',
        '相关势力'
      );
    }

    body.scrollTop = 0;
  }

  function entityLinks(ids, type, title) {
    const arr = (ids || [])
      .map(id => entity(type, id))
      .filter(Boolean);

    return `
      <div class="content-page-section">

        <div class="content-page-section-title">
          ${title}
        </div>

        <div class="content-page-list">

          ${
            arr
              .map(
                x => `
                  <button
                    class="content-page-chip"
                    data-nav-type="${type}"
                    data-nav-id="${x.id}">
                    ${WorldUtils.escapeHtml(x.name)}
                  </button>
                `
              )
              .join('') ||
            `
              <span class="content-page-chip">
                无
              </span>
            `
          }

        </div>

      </div>
    `;
  }

  function renderWorldOverview() {
    open();

    WorldState.detailSubTab = 'overview';

    content().innerHTML = `
      <div class="content-page">

        <div class="content-page-top">

          <div class="content-page-kicker">
            WORLD ATLAS / INFORMATION
          </div>

          <div class="content-page-head">

            <div>

              <div class="content-page-title">
                世界概览
              </div>

              <div class="content-page-subtitle">
                当前时间轴：
                天启${WorldUtils.toCN(
                  WorldState.currentYear
                )}年
              </div>

            </div>

            <div
              class="content-page-badge"
              style="
                color:var(--gold);
                border-color:rgba(212,167,106,.35);
                background:rgba(212,167,106,.08)
              ">
              世界
            </div>

          </div>

        </div>

        <div class="content-page-body">

          <div class="content-page-section">

            <div class="content-page-section-title">
              当前世界状态
            </div>

            <div class="content-page-grid">

              <div class="content-page-card">

                <div class="content-page-card-label">
                  地点
                </div>

                <div class="content-page-card-value">
                  ${
                    WorldData.locations.filter(
                      x =>
                        WorldMap.isActive(
                          x,
                          WorldState.currentYear
                        )
                    ).length
                  }/${WorldData.locations.length}
                </div>

              </div>

              <div class="content-page-card">

                <div class="content-page-card-label">
                  人物
                </div>

                <div class="content-page-card-value">
                  ${
                    WorldData.characters.filter(
                      x =>
                        WorldMap.isActive(
                          x,
                          WorldState.currentYear
                        )
                    ).length
                  }/${WorldData.characters.length}
                </div>

              </div>

              <div class="content-page-card">

                <div class="content-page-card-label">
                  势力
                </div>

                <div class="content-page-card-value">
                  ${
                    WorldData.factions.filter(
                      x =>
                        WorldMap.isActive(
                          x,
                          WorldState.currentYear
                        )
                    ).length
                  }/${WorldData.factions.length}
                </div>

              </div>

              <div class="content-page-card">

                <div class="content-page-card-label">
                  进行中事件
                </div>

                <div class="content-page-card-value">
                  ${
                    WorldData.events.filter(
                      x =>
                        x.start <=
                          WorldState.currentYear &&
                        x.end >=
                          WorldState.currentYear
                    ).length
                  }
                </div>

              </div>

            </div>

          </div>

          <div class="content-page-section">

            <div class="content-page-section-title">
              使用方式
            </div>

            <div class="content-page-intro">
              拖动地图浏览区域，滚轮缩放；
              点击地点、人物或势力查看右侧详情。
              时间轴会同步改变整个世界的历史状态。
            </div>

          </div>

        </div>

      </div>
    `;
  }

  /*
   * 详情页内部的导航点击。
   * 例如：
   * 地点 -> 势力
   * 势力 -> 地点
   * 事件 -> 人物
   */
  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-nav-type]');

    if (nav) {
      WorldState.select(
        nav.dataset.navType,
        nav.dataset.navId
      );

      if (
        nav.dataset.navType === 'location'
      ) {
        WorldMap.focusLocation(
          nav.dataset.navId
        );
      }

      return;
    }

    const ev = e.target.closest(
      '[data-event-id]'
    );

    if (ev) {
      WorldState.select(
        'event',
        ev.dataset.eventId
      );

      return;
    }
  });

  /*
   * 点击右侧信息页以外的空白区域：
   *
   * 关闭右侧信息页。
   *
   * 下列区域属于正常交互区域，不进行关闭：
   *
   * #mapSidebar     右侧信息页内部
   * .marker         地图地点标记
   * .topbar         顶部栏
   * .tabs-wrapper   左侧导航
   * .map-timeline   底部时间轴
   * .map-legend     地图图例
   * #infoView       全屏信息页
   * [data-nav-type] 详情页内部跳转按钮
   * [data-event-id] 事件跳转按钮
   */
  document.addEventListener('click', e => {
    const side = sidebar();

    if (!side) {
      return;
    }

    /*
     * 只有信息页处于打开状态时，
     * 点击外部才需要处理。
     */
    if (!side.classList.contains('open')) {
      return;
    }

    /*
     * 点击信息页内部，不关闭。
     */
    if (e.target.closest('#mapSidebar')) {
      return;
    }

    /*
     * 点击地图地点标记：
     * 交给地图自己的点击逻辑处理。
     */
    if (
      e.target.closest('.marker') ||
      e.target.closest('[data-location-id]')
    ) {
      return;
    }

    /*
     * 顶部控制区域不关闭。
     */
    if (
      e.target.closest('.topbar') ||
      e.target.closest('.tabs-wrapper')
    ) {
      return;
    }

    /*
     * 时间轴不关闭。
     */
    if (
      e.target.closest(
        '#timelineEvents'
      ) ||
      e.target.closest(
        '#timelineRange'
      ) ||
      e.target.closest(
        '#timelineTicks'
      ) ||
      e.target.closest(
        '#timelineStats'
      ) ||
      e.target.closest(
        '.timeline'
      ) ||
      e.target.closest(
        '.map-timeline'
      )
    ) {
      return;
    }

    /*
     * 地图图例不关闭。
     */
    if (
      e.target.closest('.map-legend')
    ) {
      return;
    }

    /*
     * 全屏信息页不关闭。
     */
    if (
      e.target.closest('#infoView')
    ) {
      return;
    }

    /*
     * 详情页中的导航按钮不关闭。
     */
    if (
      e.target.closest('[data-nav-type]') ||
      e.target.closest('[data-event-id]')
    ) {
      return;
    }

    /*
     * 到这里，说明点击的是：
     *
     * 地图空白区域
     *
     * 因此自动收起右侧信息页。
     */
    close();
  });

  function init() {
    const handle =
      document.getElementById(
        'sidebarHandle'
      );

    if (handle) {
      handle.addEventListener(
        'click',
        e => {
          /*
           * 防止 handle 点击继续冒泡，
           * 被外部点击监听误判成关闭。
           */
          e.stopPropagation();

          const side = sidebar();

          if (!side) return;

          if (
            side.classList.contains('open')
          ) {
            close();
          } else {
            open();
          }
        }
      );
    }

    renderWorldOverview();

    /*
     * 初始化时默认关闭右侧面板。
     */
    close();

    WorldState.on(reason => {
      /*
       * 时间轴变化：
       * 如果当前正在查看某个对象，
       * 保持详情页打开，并刷新历史状态。
       */
      if (
        reason === 'selection' ||
        reason === 'openLocation' ||
        reason === 'year'
      ) {
        renderSelected();
      }

      /*
       * 清除选择：
       * 显示世界概览。
       */
      if (
        reason === 'selectionClear'
      ) {
        renderWorldOverview();
      }
    });
  }

  return {
    init,
    open,
    close,
    renderSelected,
    renderWorldOverview
  };
})();
