window.SidebarUI = (() => {

  /* =========================================================
     DOM
  ========================================================= */

  const sidebar = () =>
    document.getElementById('mapSidebar');

  const content = () =>
    document.getElementById('sidebarContent');


  /* =========================================================
     面板打开
  ========================================================= */

  function open() {

    const el = sidebar();

    if (!el) {
      return;
    }

    el.classList.add('open');
    el.classList.remove('collapsed');
  }


  /* =========================================================
     面板关闭
     
     注意：
     关闭详情时同时清除当前选择。
     
     不主动 renderWorldOverview()，
     避免：
     
       close
       ↓
       selectionClear
       ↓
       renderWorldOverview
       ↓
       open
     
     形成重新打开的循环。
  ========================================================= */

  function close() {

    const el = sidebar();

    if (!el) {
      return;
    }

    el.classList.remove('open');
    el.classList.add('collapsed');

    /*
     * 使用 WorldState 的统一状态接口。
     */
    if (
      window.WorldState &&
      typeof WorldState.clearSelection === 'function'
    ) {

      WorldState.clearSelection();

    } else {

      /*
       * 兼容旧版本 WorldState。
       */
      WorldState.selectedEntity = null;
      WorldState.selectedLocationId = null;

    }


    /*
     * 清除所有视觉选中状态。
     *
     * 注意：
     * 这里不清除关系图的缩放 / 平移状态。
     */
    document
      .querySelectorAll(
        '.selected, .active'
      )
      .forEach(
        element =>
          element.classList.remove(
            'selected',
            'active'
          )
      );
  }


  /* =========================================================
     实体查找
  ========================================================= */

  function entity(type, id) {

    if (
      type === 'location'
    ) {

      return WorldData.locations.find(
        item =>
          item.id === id
      );

    }


    if (
      type === 'faction'
    ) {

      return WorldData.factions.find(
        item =>
          item.id === id
      );

    }


    if (
      type === 'character'
    ) {

      return WorldData.characters.find(
        item =>
          item.id === id
      );

    }


    if (
      type === 'event'
    ) {

      return WorldData.events.find(
        item =>
          item.id === id
      );

    }


    return null;
  }


  /* =========================================================
     当前状态
  ========================================================= */

  function stateFor(
    item
  ) {

    return WorldMap.currentState(
      item,
      WorldState.currentYear
    );
  }


  /* =========================================================
     相关地点
  ========================================================= */

  function relatedLocationIdsForEntity(
    type,
    item
  ) {

    if (
      type === 'faction'
    ) {

      return item.territory || [];

    }


    if (
      type === 'character'
    ) {

      return item.locationIds || [];

    }


    return [];
  }


  /* =========================================================
     根据当前选择渲染
  ========================================================= */

  function renderSelected() {

    const selected =
      WorldState.selectedEntity;


    /*
     * 没有选择实体：
     * 不主动打开世界概览。
     *
     * 防止：
     * 点击空白关闭面板时又重新打开。
     */
    if (!selected) {

      return;

    }


    const item =
      entity(
        selected.type,
        selected.id
      );


    if (!item) {

      return;

    }


    open();


    if (
      selected.type === 'location'
    ) {

      renderLocation(item);

      return;
    }


    if (
      selected.type === 'faction'
    ) {

      renderFaction(item);

      return;
    }


    if (
      selected.type === 'character'
    ) {

      renderCharacter(item);

      return;
    }


    if (
      selected.type === 'event'
    ) {

      renderEvent(item);

      return;
    }
  }


  /* =========================================================
     详情页 Tab
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


    const list =
      maps[type] || [];


    return `
      <div class="detail-tabs">

        ${list.map(
          ([id, label]) => `
            <button
              type="button"
              class="detail-tab ${
                WorldState.detailSubTab === id
                  ? 'active'
                  : ''
              }"
              data-detail-tab="${id}"
            >
              ${label}
            </button>
          `
        ).join('')}

      </div>
    `;
  }


  /* =========================================================
     详情头部
  ========================================================= */

  function header(
    item,
    type,
    badgeColor,
    label
  ) {

    const status =
      WorldMap.currentState(
        item,
        WorldState.currentYear
      );


    const title =
      WorldUtils.escapeHtml(
        item.name || ''
      );


    const subtitle =
      WorldUtils.escapeHtml(
        status?.label ||
        item.role ||
        item.region ||
        '世界档案'
      );


    return `
      <div class="content-page-top">

        <div class="content-page-kicker">
          ${String(type).toUpperCase()}
          PROFILE /
          ${String(item.id || '').toUpperCase()}
        </div>


        <div class="content-page-head">

          <div>

            <div class="content-page-title">
              ${title}
            </div>


            <div class="content-page-subtitle">
              天启${WorldUtils.toCN(
                WorldState.currentYear
              )}年 · ${subtitle}
            </div>

          </div>


          <div
            class="content-page-badge"
            style="
              color:${badgeColor};
              border-color:${WorldUtils.hexA(
                badgeColor,
                .35
              )};
              background:${WorldUtils.hexA(
                badgeColor,
                .08
              )};
            "
          >
            ${WorldUtils.escapeHtml(label)}
          </div>

        </div>

      </div>
    `;
  }


  /* =========================================================
     概览
  ========================================================= */

  function overview(
    item,
    type
  ) {

    const stats =
      item.stats || {};


    const state =
      WorldMap.currentState(
        item,
        WorldState.currentYear
      );


    const cards =
      Object
        .entries(stats)
        .slice(0, 4)
        .map(
          ([key, value]) => `
            <div class="content-page-card">

              <div class="content-page-card-label">
                ${WorldUtils.escapeHtml(
                  key
                )}
              </div>

              <div class="content-page-card-value">
                ${WorldUtils.escapeHtml(
                  value
                )}
              </div>

            </div>
          `
        )
        .join('');


    return `

      <div class="content-page-section">

        <div class="content-page-section-title">
          当前状态
        </div>


        <div
          class="state-badge"
          style="
            color:${
              state?.color ||
              'var(--gold)'
            }
          "
        >

          <span class="state-dot"></span>

          ${WorldUtils.escapeHtml(
            state?.label ||
            '当前状态'
          )}

        </div>

      </div>



      <div class="content-page-section">

        <div class="content-page-section-title">
          档案摘要
        </div>


        <div class="content-page-intro">

          ${WorldUtils.escapeHtml(
            item.desc ||
            '暂无描述。'
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
     创建详情页面
  ========================================================= */

  function renderShell(
    item,
    type,
    badgeColor,
    label
  ) {

    const box =
      content();


    if (!box) {
      return null;
    }


    box.innerHTML = `

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


    return document.getElementById(
      'detailBody'
    );
  }


  /* =========================================================
     详情 Tab 点击
  ========================================================= */

  function wireTabs() {

    document
      .querySelectorAll(
        '.detail-tab'
      )
      .forEach(
        button => {

          button.type =
            'button';


          button.addEventListener(
            'click',
            event => {

              /*
               * 阻止 document 全局点击事件。
               */
              event.preventDefault();
              event.stopPropagation();


              const subTab =
                button.dataset.detailTab;


              if (!subTab) {
                return;
              }


              WorldState.detailSubTab =
                subTab;


              renderSelected();

            },
            false
          );

        }
      );
  }


  /* =========================================================
     地点详情
  ========================================================= */

  function renderLocation(
    location
  ) {

    const body =
      renderShell(
        location,
        'location',
        location.color,
        location.type
      );


    if (!body) {
      return;
    }


    const sub =
      WorldState.detailSubTab;


    /* 概览 */
    if (
      sub === 'overview'
    ) {

      body.innerHTML =
        overview(
          location,
          'location'
        ) +

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
                天启${WorldUtils.toCN(
                  location.startYear
                )}年
              </div>

            </div>

          </div>

        `;
    }


    /* 资源 */
    if (
      sub === 'resources'
    ) {

      body.innerHTML = `

        <div class="content-page-section">

          <div class="content-page-section-title">
            资源清单
          </div>


          <div class="content-page-list">

            ${
              (location.res || [])
                .map(
                  resource => `
                    <span class="content-page-chip">
                      ${WorldUtils.escapeHtml(
                        resource
                      )}
                    </span>
                  `
                )
                .join('')

              ||

              `
                <span class="content-page-chip">
                  暂无资源
                </span>
              `
            }

          </div>

        </div>

      `;
    }


    /* 关系 */
    if (
      sub === 'relations'
    ) {

      body.innerHTML =
        locationRelations(
          location
        );
    }


    /* 事件 */
    if (
      sub === 'events'
    ) {

      body.innerHTML =
        eventsFor(
          'location',
          location.id
        );
    }


    body.scrollTop = 0;
  }


  /* =========================================================
     地点关系
  ========================================================= */

  function locationRelations(
    location
  ) {

    const faction =
      location.factionId
        ? WorldData.factions.find(
            item =>
              item.id ===
              location.factionId
          )
        : null;


    const characters =
      WorldData.characters.filter(
        character =>
          (
            character.locationIds ||
            []
          ).includes(
            location.id
          )
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
                ${WorldUtils.escapeHtml(
                  faction.name
                )}
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
            characters
              .map(
                character => `
                  <button
                    type="button"
                    class="content-page-chip"
                    data-nav-type="character"
                    data-nav-id="${character.id}"
                  >
                    ${WorldUtils.escapeHtml(
                      character.name
                    )}
                  </button>
                `
              )
              .join('')

            ||

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


  /* =========================================================
     势力详情
  ========================================================= */

  function renderFaction(
    faction
  ) {

    const body =
      renderShell(
        faction,
        'faction',
        faction.color,
        '势力'
      );


    if (!body) {
      return;
    }


    const sub =
      WorldState.detailSubTab;


    /* 概览 */
    if (
      sub === 'overview'
    ) {

      body.innerHTML =
        overview(
          faction,
          'faction'
        ) +

        `

          <div class="content-page-section">

            <div class="content-page-section-title">
              阵营
            </div>


            <div class="content-page-list">

              <span
                class="content-page-chip"
                style="
                  color:${faction.color}
                "
              >
                ${WorldUtils.escapeHtml(
                  faction.category ||
                  ''
                )}
              </span>


              <span class="content-page-chip">
                ${WorldUtils.escapeHtml(
                  faction.role ||
                  ''
                )}
              </span>

            </div>

          </div>

        `;
    }


    /* 关系 */
    if (
      sub === 'relations'
    ) {

      body.innerHTML =
        factionRelations(
          faction
        );
    }


    /* 领地 */
    if (
      sub === 'territory'
    ) {

      body.innerHTML =
        territory(
          faction
        );
    }


    /* 事件 */
    if (
      sub === 'events'
    ) {

      body.innerHTML =
        eventsFor(
          'faction',
          faction.id
        );
    }


    body.scrollTop = 0;
  }


  /* =========================================================
     势力关系
  ========================================================= */

  function factionRelations(
    faction
  ) {

    const edges =
      WorldData.factionRelations.filter(
        relation =>
          (
            relation.from ===
            faction.id
          ) ||

          (
            relation.to ===
            faction.id
          )
      );


    return `

      <div class="content-page-section">

        <div class="content-page-section-title">
          当前关系
        </div>


        ${
          edges
            .map(
              relation => {

                const otherId =
                  relation.from ===
                  faction.id
                    ? relation.to
                    : relation.from;


                const other =
                  WorldData.factions.find(
                    item =>
                      item.id ===
                      otherId
                  );


                return `

                  <div class="content-page-stat-row">

                    <span class="content-page-stat-key">
                      ${WorldUtils.escapeHtml(
                        other?.name ||
                        otherId
                      )}
                    </span>


                    <span
                      class="content-page-stat-value"
                      style="
                        color:${
                          relation.color ||
                          'var(--gold)'
                        }
                      "
                    >
                      ${WorldUtils.escapeHtml(
                        relation.label ||
                        ''
                      )}
                    </span>

                  </div>

                `;
              }
            )
            .join('')

          ||

          `
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

  function territory(
    faction
  ) {

    const locations =
      WorldData.locations.filter(
        location =>
          (
            faction.territory ||
            []
          ).includes(
            location.id
          ) &&

          WorldMap.isActive(
            location,
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
            locations
              .map(
                location => `
                  <button
                    type="button"
                    class="content-page-chip"
                    data-nav-type="location"
                    data-nav-id="${location.id}"
                  >
                    ${WorldUtils.escapeHtml(
                      location.name
                    )}
                  </button>
                `
              )
              .join('')

            ||

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


  /* =========================================================
     人物详情
  ========================================================= */

  function renderCharacter(
    character
  ) {

    const body =
      renderShell(
        character,
        'character',
        character.color,
        '人物'
      );


    if (!body) {
      return;
    }


    const sub =
      WorldState.detailSubTab;


    /* 概览 */
    if (
      sub === 'overview'
    ) {

      body.innerHTML =
        overview(
          character,
          'character'
        );
    }


    /* 关系 */
    if (
      sub === 'relations'
    ) {

      body.innerHTML =
        characterRelations(
          character
        );
    }


    /* 地点 */
    if (
      sub === 'locations'
    ) {

      const locations =
        (
          character.locationIds ||
          []
        )
          .map(
            id =>
              WorldData.locations.find(
                location =>
                  location.id === id
              )
          )
          .filter(Boolean)
          .filter(
            location =>
              location.startYear <=
              WorldState.currentYear
          );


      body.innerHTML = `

        <div class="content-page-section">

          <div class="content-page-section-title">
            相关地点
          </div>


          <div class="content-page-list">

            ${
              locations
                .map(
                  location => `
                    <button
                      type="button"
                      class="content-page-chip"
                      data-nav-type="location"
                      data-nav-id="${location.id}"
                    >
                      ${WorldUtils.escapeHtml(
                        location.name
                      )}
                    </button>
                  `
                )
                .join('')

              ||

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


    /* 事件 */
    if (
      sub === 'events'
    ) {

      body.innerHTML =
        eventsFor(
          'character',
          character.id
        );
    }


    body.scrollTop = 0;
  }


  /* =========================================================
     人物关系
     
     修正：
     
       原本：
       x.from === c.id || x.to === c.id && isActive
     
       实际优先级不正确。
     
       现在：
       (
         x.from === c.id ||
         x.to === c.id
       )
       &&
       isActive
  ========================================================= */

  function characterRelations(
    character
  ) {

    const activeEdges =
      WorldData.characterRelations.filter(
        relation =>

          (
            relation.from ===
            character.id ||

            relation.to ===
            character.id
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
            .map(
              relation => {

                const otherId =
                  relation.from ===
                  character.id
                    ? relation.to
                    : relation.from;


                const other =
                  WorldData.characters.find(
                    item =>
                      item.id ===
                      otherId
                  );


                return `

                  <div class="content-page-stat-row">

                    <span class="content-page-stat-key">
                      ${WorldUtils.escapeHtml(
                        other?.name ||
                        otherId
                      )}
                    </span>


                    <span
                      class="content-page-stat-value"
                      style="
                        color:${
                          relation.color ||
                          'var(--gold)'
                        }
                      "
                    >
                      ${WorldUtils.escapeHtml(
                        relation.label ||
                        ''
                      )}
                    </span>

                  </div>

                `;
              }
            )
            .join('')

          ||

          `
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

  function eventsFor(
    type,
    id
  ) {

    const key =
      type === 'location'
        ? 'locationIds'
        : type === 'faction'
          ? 'factionIds'
          : 'characterIds';


    const items =
      WorldData.events.filter(
        event =>
          (
            event[key] || []
          ).includes(id)
      );


    return `

      <div class="content-page-section">

        <div class="content-page-section-title">
          相关事件
        </div>


        ${
          items
            .map(
              event => {

                const ongoing =
                  event.start <=
                  WorldState.currentYear &&

                  event.end >=
                  WorldState.currentYear;


                const future =
                  event.start >
                  WorldState.currentYear;


                const status =
                  ongoing
                    ? '进行中'
                    : future
                      ? '未发生'
                      : '已结束';


                return `

                  <div
                    class="content-page-event"
                    data-event-id="${event.id}"
                    style="
                      border-color:${WorldUtils.hexA(
                        event.color ||
                        '#d4a76a',
                        .45
                      )}
                    "
                  >

                    <div
                      class="content-page-event-name"
                      style="
                        color:${
                          event.color ||
                          'var(--gold)'
                        }
                      "
                    >
                      ${WorldUtils.escapeHtml(
                        event.name
                      )}
                    </div>


                    <div class="content-page-event-time">

                      天启${WorldUtils.toCN(
                        event.start
                      )}年 —

                      天启${WorldUtils.toCN(
                        event.end
                      )}年

                      ·

                      ${status}

                    </div>


                    <div class="content-page-event-desc">

                      ${WorldUtils.escapeHtml(
                        event.desc ||
                        ''
                      )}

                    </div>

                  </div>

                `;
              }
            )
            .join('')

          ||

          `
            <div class="content-page-empty">
              暂无关联事件。
            </div>
          `
        }

      </div>

    `;
  }


  /* =========================================================
     历史事件详情
  ========================================================= */

  function renderEvent(
    event
  ) {

    const body =
      renderShell(
        event,
        'event',
        event.color ||
        'var(--gold)',
        '历史事件'
      );


    if (!body) {
      return;
    }


    const sub =
      WorldState.detailSubTab;


    /* 概览 */
    if (
      sub === 'overview'
    ) {

      body.innerHTML = `

        <div class="content-page-section">

          <div class="content-page-section-title">
            事件概述
          </div>


          <div class="content-page-intro">
            ${WorldUtils.escapeHtml(
              event.desc ||
              ''
            )}
          </div>

        </div>



        <div class="content-page-section">

          <div class="content-page-grid">

            <div class="content-page-card">

              <div class="content-page-card-label">
                开始
              </div>


              <div class="content-page-card-value">
                天启${WorldUtils.toCN(
                  event.start
                )}年
              </div>

            </div>


            <div class="content-page-card">

              <div class="content-page-card-label">
                结束
              </div>


              <div class="content-page-card-value">
                天启${WorldUtils.toCN(
                  event.end
                )}年
              </div>

            </div>

          </div>

        </div>

      `;
    }


    /* 地点 */
    if (
      sub === 'locations'
    ) {

      body.innerHTML =
        entityLinks(
          event.locationIds,
          'location',
          '相关地点'
        );
    }


    /* 人物 */
    if (
      sub === 'characters'
    ) {

      body.innerHTML =
        entityLinks(
          event.characterIds,
          'character',
          '相关人物'
        );
    }


    /* 势力 */
    if (
      sub === 'factions'
    ) {

      body.innerHTML =
        entityLinks(
          event.factionIds,
          'faction',
          '相关势力'
        );
    }


    body.scrollTop = 0;
  }


  /* =========================================================
     实体跳转列表
  ========================================================= */

  function entityLinks(
    ids,
    type,
    title
  ) {

    const list =
      (ids || [])
        .map(
          id =>
            entity(
              type,
              id
            )
        )
        .filter(Boolean);


    return `

      <div class="content-page-section">

        <div class="content-page-section-title">
          ${WorldUtils.escapeHtml(
            title
          )}
        </div>


        <div class="content-page-list">

          ${
            list
              .map(
                item => `
                  <button
                    type="button"
                    class="content-page-chip"
                    data-nav-type="${type}"
                    data-nav-id="${item.id}"
                  >
                    ${WorldUtils.escapeHtml(
                      item.name
                    )}
                  </button>
                `
              )
              .join('')

            ||

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


  /* =========================================================
     世界概览
     
     保留这个函数供初始化调用。
     
     但是在 close() 时不会自动调用。
  ========================================================= */

  function renderWorldOverview() {

    const box =
      content();


    if (!box) {
      return;
    }


    WorldState.detailSubTab =
      'overview';


    box.innerHTML = `

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
                border-color:rgba(
                  212,
                  167,
                  106,
                  .35
                );
                background:rgba(
                  212,
                  167,
                  106,
                  .08
                );
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
                      location =>
                        WorldMap.isActive(
                          location,
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
                      character =>
                        WorldMap.isActive(
                          character,
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
                      faction =>
                        WorldMap.isActive(
                          faction,
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
                      event =>
                        event.start <=
                        WorldState.currentYear &&

                        event.end >=
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


  /* =========================================================
     文档级导航
     
     处理：
       - 详情中的地点
       - 详情中的人物
       - 详情中的势力
       - 详情中的事件
  ========================================================= */

  document.addEventListener(
    'click',
    event => {

      const target =
        event.target instanceof Element
          ? event.target
          : null;


      if (!target) {
        return;
      }


      /* -------------------------------------------------------
         实体导航
      ------------------------------------------------------- */

      const nav =
        target.closest(
          '[data-nav-type]'
        );


      if (nav) {

        event.preventDefault();
        event.stopPropagation();


        const type =
          nav.dataset.navType;

        const id =
          nav.dataset.navId;


        if (
          !type ||
          !id
        ) {
          return;
        }


        /*
         * 通过统一状态系统打开目标详情。
         */
        WorldState.select(
          type,
          id
        );


        /*
         * 注意：
         *
         * 这里不再对 location 自动调用
         * WorldMap.focusLocation()。
         *
         * 这样从：
         *
         * 地点详情 -> 相关地点
         *
         * 跳转时也不会把地图强制移动到屏幕中心。
         */
        return;
      }


      /* -------------------------------------------------------
         事件导航
      ------------------------------------------------------- */

      const eventTarget =
        target.closest(
          '[data-event-id]'
        );


      if (eventTarget) {

        event.preventDefault();
        event.stopPropagation();


        const id =
          eventTarget.dataset.eventId;


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
         没有打开详情面板
      ------------------------------------------------------- */

      const currentSidebar =
        sidebar();


      if (!currentSidebar) {
        return;
      }


      if (
        !currentSidebar.classList.contains(
          'open'
        )
      ) {
        return;
      }


      /* -------------------------------------------------------
         点击右侧详情面板内部
         不关闭
      ------------------------------------------------------- */

      if (
        target.closest(
          '#mapSidebar'
        )
      ) {
        return;
      }


      /* -------------------------------------------------------
         以下都是“可交互区域”
         
         点击这些区域时：
         保持详情面板打开。
      ------------------------------------------------------- */

      const keepOpen =
        target.closest(`

          .resource-card,
          [data-resource-id],

          .rel-node,
          .marker,

          .info-tab,
          .detail-tab,

          [data-resource-filter],

          [data-nav-type],
          [data-event-id],

          #btnBackMap,
          #sidebarHandle,

          .tabs-wrapper,
          .topbar,

          .map-timeline,
          .map-legend,

          .timeline-event,

          .graph-large-svg,
          .graph-large-wrap

        `);


      if (keepOpen) {
        return;
      }


      /* -------------------------------------------------------
         点击其他区域 = 空白区域
         收起详情面板
         
         但是：
         不切换当前资源 / 势力 / 人物页面。
      ------------------------------------------------------- */

      close();

    },
    false
  );


  /* =========================================================
     初始化
  ========================================================= */

  function init() {

    const handle =
      document.getElementById(
        'sidebarHandle'
      );


    /* -------------------------------------------------------
       侧边栏手柄
    ------------------------------------------------------- */

    if (handle) {

      handle.addEventListener(
        'click',
        event => {

          event.preventDefault();
          event.stopPropagation();


          const el =
            sidebar();


          if (!el) {
            return;
          }


          if (
            el.classList.contains(
              'open'
            )
          ) {

            close();

          } else {

            /*
             * 手动打开手柄时：
             * 如果存在当前选择，则重新显示当前详情。
             *
             * 如果没有选择，则只打开空面板，
             * 不自动制造一个世界概览选择。
             */
            if (
              WorldState.selectedEntity
            ) {

              renderSelected();

            } else {

              open();

            }

          }

        },
        false
      );
    }


    /* -------------------------------------------------------
       初始内容
       
       只渲染，不保持打开状态。
    ------------------------------------------------------- */

    renderWorldOverview();

    close();


    /* -------------------------------------------------------
       状态监听
    ------------------------------------------------------- */

    WorldState.on(
      reason => {

        /*
         * 选择实体：
         * 打开对应详情。
         */
        if (
          reason === 'selection'
        ) {

          renderSelected();

          return;
        }


        /*
         * 兼容地图旧事件。
         *
         * 只有存在选中实体时才渲染。
         */
        if (
          reason === 'openLocation'
        ) {

          if (
            WorldState.selectedEntity
          ) {

            renderSelected();

          }

          return;
        }


        /*
         * 年份变化：
         *
         * 如果当前已经打开某个详情，
         * 根据新的年份刷新详情。
         *
         * 如果当前没有选择，
         * 什么都不做。
         */
        if (
          reason === 'year'
        ) {

          if (
            WorldState.selectedEntity
          ) {

            renderSelected();

          }

          return;
        }


        /*
         * selectionClear 故意不重新渲染世界概览。
         *
         * 否则关闭面板后会立即重新打开。
         */
        if (
          reason === 'selectionClear'
        ) {

          return;
        }

      }
    );

  }


  /* =========================================================
     对外接口
  ========================================================= */

  return {

    init,

    open,

    close,

    renderSelected,

    renderWorldOverview

  };

})();
