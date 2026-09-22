window.SidebarUI = (() => {

  const sidebar = () => document.getElementById('mapSidebar');
  const content = () => document.getElementById('sidebarContent');

  /* =========================================================
     面板开关
  ========================================================= */

  function open() {
    sidebar().classList.add('open');
    sidebar().classList.remove('collapsed');
  }

  function close() {
    sidebar().classList.remove('open');
    sidebar().classList.add('collapsed');

    WorldState.selectedEntity = null;

    document
      .querySelectorAll('.selected')
      .forEach(x => x.classList.remove('selected'));
  }


  /* =========================================================
     当前实体状态
  ========================================================= */

  function stateFor(item) {
    return WorldMap.currentState(
      item,
      WorldState.currentYear
    );
  }


  /* =========================================================
     根据类型获取实体
  ========================================================= */

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


  /* =========================================================
     相关地点
  ========================================================= */

  function relatedLocationIdsForEntity(type, item) {

    if (type === 'faction') {
      return item.territory || [];
    }

    if (type === 'character') {
      return item.locationIds || [];
    }

    return [];
  }


  /* =========================================================
     根据当前选择重新渲染详情
  ========================================================= */

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


  /* =========================================================
     详情页顶部 Tab
  ========================================================= */

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

    return `
      <div class="detail-tabs">
        ${maps[type].map(([id, label]) => `
          <button
            type="button"
            class="detail-tab ${WorldState.detailSubTab === id ? 'active' : ''}"
            data-detail-tab="${id}"
          >
            ${label}
          </button>
        `).join('')}
      </div>
    `;
  }


  /* =========================================================
     详情页头部
  ========================================================= */

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
              border-color:${WorldUtils.hexA(badgeColor, .35)};
              background:${WorldUtils.hexA(badgeColor, .08)}
            "
          >
            ${label}
          </div>

        </div>

      </div>
    `;
  }


  /* =========================================================
     概览
  ========================================================= */

  function overview(item, type) {

    const stats = item.stats || {};

    const cards = Object
      .entries(stats)
      .slice(0, 4)
      .map(([k, v]) => `
        <div class="content-page-card">

          <div class="content-page-card-label">
            ${WorldUtils.escapeHtml(k)}
          </div>

          <div class="content-page-card-value">
            ${WorldUtils.escapeHtml(v)}
          </div>

        </div>
      `)
      .join('');

    const state = WorldMap.currentState(
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
          style="color:${state?.color || 'var(--gold)'}"
        >
          <span class="state-dot"></span>
          ${WorldUtils.escapeHtml(
            state?.label || '当前状态'
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


  /* =========================================================
     创建详情页外壳
  ========================================================= */

  function renderShell(item, type, badgeColor, label) {

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
          id="detailBody"
        ></div>

      </div>
    `;

    wireTabs();

    return document.getElementById('detailBody');
  }


  /* =========================================================
     详情 Tab 点击
  ========================================================= */

  function wireTabs() {

    document
      .querySelectorAll('.detail-tab')
      .forEach(btn => {

        btn.type = 'button';

        btn.addEventListener('click', event => {

          event.preventDefault();
          event.stopPropagation();

          WorldState.detailSubTab =
            btn.dataset.detailTab;

          renderSelected();

        }, false);

      });
  }


  /* =========================================================
     地点详情
  ========================================================= */

  function renderLocation(loc) {

    const body = renderShell(
      loc,
      'location',
      loc.color,
      loc.type
    );

    const sub =
      WorldState.detailSubTab;

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

            ${loc.res.map(x => `
              <span class="content-page-chip">
                ${WorldUtils.escapeHtml(x)}
              </span>
            `).join('')}

          </div>

        </div>
      `;
    }

    if (sub === 'relations') {
      body.innerHTML =
        locationRelations(loc);
    }

    if (sub === 'events') {
      body.innerHTML =
        eventsFor(
          'location',
          loc.id
        );
    }

    body.scrollTop = 0;
  }


  /* =========================================================
     地点关系
  ========================================================= */

  function locationRelations(loc) {

    const faction =
      loc.factionId
        ? WorldData.factions.find(
            x => x.id === loc.factionId
          )
        : null;

    const chars =
      WorldData.characters.filter(
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
                type="button"
                class="content-page-chip"
                data-nav-type="faction"
                data-nav-id="${faction.id}"
              >
                ${faction.name}
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
              .map(c => `
                <button
                  type="button"
                  class="content-page-chip"
                  data-nav-type="character"
                  data-nav-id="${c.id}"
                >
                  ${c.name}
                </button>
              `)
              .join('')

            || '<span class="content-page-chip">暂无人物</span>'
          }

        </div>

      </div>
    `;
  }


  /* =========================================================
     势力详情
  ========================================================= */

  function renderFaction(f) {

    const body = renderShell(
      f,
      'faction',
      f.color,
      '势力'
    );

    const sub =
      WorldState.detailSubTab;

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
                style="color:${f.color}"
              >
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
      body.innerHTML =
        factionRelations(f);
    }

    if (sub === 'territory') {
      body.innerHTML =
        territory(f);
    }

    if (sub === 'events') {
      body.innerHTML =
        eventsFor(
          'faction',
          f.id
        );
    }

    body.scrollTop = 0;
  }


  /* =========================================================
     势力关系
  ========================================================= */

  function factionRelations(f) {

    const edges =
      WorldData.factionRelations.filter(
        x =>
          x.from === f.id ||
          x.to === f.id
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
                    ${other?.name || id}
                  </span>

                  <span
                    class="content-page-stat-value"
                    style="color:${e.color || 'var(--gold)'}"
                  >
                    ${e.label}
                  </span>

                </div>
              `;
            })
            .join('')

          || `
            <div class="content-page-empty">
              当前没有生效关系。
            </div>
          `
        }

      </div>
    `;
  }


  /* =========================================================
     势力领地
  ========================================================= */

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
              .map(l => `
                <button
                  type="button"
                  class="content-page-chip"
                  data-nav-type="location"
                  data-nav-id="${l.id}"
                >
                  ${l.name}
                </button>
              `)
              .join('')

            || `
              <span class="content-page-chip">
                当前无已解锁领地
              </span>
            `
          }

        </div>

      </div>
    `;
  }


  /* =========================================================
     人物详情
  ========================================================= */

  function renderCharacter(c) {

    const body = renderShell(
      c,
      'character',
      c.color,
      '人物'
    );

    const sub =
      WorldState.detailSubTab;

    if (sub === 'overview') {
      body.innerHTML =
        overview(c, 'character');
    }

    if (sub === 'relations') {
      body.innerHTML =
        characterRelations(c);
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
                .map(l => `
                  <button
                    type="button"
                    class="content-page-chip"
                    data-nav-type="location"
                    data-nav-id="${l.id}"
                  >
                    ${l.name}
                  </button>
                `)
                .join('')

              || `
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

      body.innerHTML =
        eventsFor(
          'character',
          c.id
        );
    }

    body.scrollTop = 0;
  }


  /* =========================================================
     人物关系
  ========================================================= */

  function characterRelations(c) {

    const activeEdges =
      WorldData.characterRelations.filter(
        relation =>
          (
            relation.from === c.id ||
            relation.to === c.id
          ) &&
          WorldMap.isActive(
            relation,
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
                    ${o?.name || id}
                  </span>

                  <span
                    class="content-page-stat-value"
                    style="color:${e.color || 'var(--gold)'}"
                  >
                    ${e.label}
                  </span>

                </div>
              `;
            })
            .join('')

          || `
            <div class="content-page-empty">
              当前没有生效关系。
            </div>
          `
        }

      </div>
    `;
  }


  /* =========================================================
     事件列表
  ========================================================= */

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
            .map(e => `
              <div
                class="content-page-event"
                data-event-id="${e.id}"
                style="
                  border-color:${WorldUtils.hexA(e.color, .45)}
                "
              >

                <div
                  class="content-page-event-name"
                  style="color:${e.color}"
                >
                  ${e.name}
                </div>

                <div class="content-page-event-time">
                  天启${WorldUtils.toCN(e.start)}年 —
                  天启${WorldUtils.toCN(e.end)}年 ·
                  ${
                    e.start <= WorldState.currentYear &&
                    e.end >= WorldState.currentYear
                      ? '进行中'
                      : e.start > WorldState.currentYear
                        ? '未发生'
                        : '已结束'
                  }
                </div>

                <div class="content-page-event-desc">
                  ${WorldUtils.escapeHtml(e.desc)}
                </div>

              </div>
            `)
            .join('')

          || `
            <div class="content-page-empty">
              暂无关联事件。
            </div>
          `
        }

      </div>
    `;
  }


  /* =========================================================
     事件详情
  ========================================================= */

  function renderEvent(e) {

    const body = renderShell(
      e,
      'event',
      e.color,
      '历史事件'
    );

    const sub =
      WorldState.detailSubTab;

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
      body.innerHTML =
        entityLinks(
          e.locationIds,
          'location',
          '相关地点'
        );
    }

    if (sub === 'characters') {
      body.innerHTML =
        entityLinks(
          e.characterIds,
          'character',
          '相关人物'
        );
    }

    if (sub === 'factions') {
      body.innerHTML =
        entityLinks(
          e.factionIds,
          'faction',
          '相关势力'
        );
    }

    body.scrollTop = 0;
  }


  /* =========================================================
     实体跳转按钮
  ========================================================= */

  function entityLinks(ids, type, title) {

    const arr =
      (ids || [])
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
              .map(x => `
                <button
                  type="button"
                  class="content-page-chip"
                  data-nav-type="${type}"
                  data-nav-id="${x.id}"
                >
                  ${x.name}
                </button>
              `)
              .join('')

            || `
              <span class="content-page-chip">
                无
              </span>
            `
          }

        </div>

      </div>
    `;
  }


  /* =========================================================
     世界概览
  ========================================================= */

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
                天启${WorldUtils.toCN(WorldState.currentYear)}年
              </div>

            </div>

            <div
              class="content-page-badge"
              style="
                color:var(--gold);
                border-color:rgba(212,167,106,.35);
                background:rgba(212,167,106,.08)
              "
            >
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
                        x.start <= WorldState.currentYear &&
                        x.end >= WorldState.currentYear
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


  /* =========================================================
     内部导航
  ========================================================= */

  document.addEventListener('click', event => {

    /* -------------------------------------------------------
       1. 详情页内部实体跳转
    ------------------------------------------------------- */

    const nav =
      event.target.closest(
        '[data-nav-type]'
      );

    if (nav) {

      event.preventDefault();
      event.stopPropagation();

      const type =
        nav.dataset.navType;

      const id =
        nav.dataset.navId;

      if (!type || !id) {
        return;
      }

      WorldState.select(
        type,
        id
      );

      if (type === 'location') {
        WorldMap.focusLocation(id);
      }

      return;
    }


    /* -------------------------------------------------------
       2. 事件详情跳转
    ------------------------------------------------------- */

    const ev =
      event.target.closest(
        '[data-event-id]'
      );

    if (ev) {

      event.preventDefault();
      event.stopPropagation();

      const id =
        ev.dataset.eventId;

      if (!id) {
        return;
      }

      WorldState.select(
        'event',
        id
      );

      return;
    }


    /* -------------------------------------------------------
       3. 没有打开详情面板，不处理
    ------------------------------------------------------- */

    const currentSidebar =
      sidebar();

    if (!currentSidebar) {
      return;
    }

    if (!currentSidebar.classList.contains('open')) {
      return;
    }


    /* -------------------------------------------------------
       4. 点击详情面板内部，不关闭
    ------------------------------------------------------- */

    if (
      event.target.closest(
        '#mapSidebar'
      )
    ) {
      return;
    }


    /* -------------------------------------------------------
       5. 点击这些交互元素，不关闭
       
       注意：
       不再判断整个 #infoView。

       因为：
       #infoView = 整个“资源 / 势力 / 人物关系”页面

       如果这里直接 return #infoView，
       那么页面空白区域永远不会触发关闭。
    ------------------------------------------------------- */

    const keepOpenTarget =
      event.target.closest(`
        .resource-card,
        [data-resource-id],
        .rel-node,
        .marker,
        .info-tab,
        .detail-tab,
        [data-resource-filter],
        #btnBackMap,
        .tabs-wrapper,
        .topbar,
        .map-timeline,
        .map-legend,
        .timeline-event
      `);

    if (keepOpenTarget) {
      return;
    }


    /* -------------------------------------------------------
       6. 点击其余区域 = 空白区域
          收起右侧详情面板
       
       当前页面保持不变：
       资源页仍然是资源页
       势力页仍然是势力页
       人物关系页仍然是人物关系页
    ------------------------------------------------------- */

    close();
  });


  /* =========================================================
     初始化
  ========================================================= */

  function init() {

    const handle =
      document.getElementById(
        'sidebarHandle'
      );

    if (handle) {

      handle.addEventListener(
        'click',
        event => {

          event.preventDefault();
          event.stopPropagation();

          if (
            sidebar().classList.contains('open')
          ) {
            close();
          } else {
            open();
          }

        }
      );
    }


    renderWorldOverview();

    /* 初始化时默认收起 */
    close();


    /* -------------------------------------------------------
       状态变化
    ------------------------------------------------------- */

    WorldState.on(reason => {

      if (
        reason === 'selection' ||
        reason === 'openLocation' ||
        reason === 'year'
      ) {
        renderSelected();
      }

      /*
       * 这里故意不监听 selectionClear。
       *
       * 因为 close() 本身会清空 selectedEntity，
       * 如果这里再收到 selectionClear 后 renderWorldOverview()
       * 就会马上重新打开详情面板，形成：
       *
       * close -> selectionClear -> renderWorldOverview -> open
       *
       * 的错误循环。
       */
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
