window.SidebarUI = (() => {
  const sidebar = () =>
    document.getElementById(
      'mapSidebar'
    );

  const content = () =>
    document.getElementById(
      'sidebarContent'
    );

  function open() {
    const el = sidebar();

    if (!el) {
      return;
    }

    el.classList.add('open');
    el.classList.remove(
      'collapsed'
    );
  }

  function close() {
    const el = sidebar();

    if (!el) {
      return;
    }

    el.classList.remove(
      'open'
    );

    el.classList.add(
      'collapsed'
    );

    /*
     * 关闭详情时统一清除全局选中状态。
     */
    if (
      WorldState.selectedEntity
    ) {
      WorldState.clearSelection();
    }
  }

  function entity(type, id) {
    if (type === 'location') {
      return WorldData.locations.find(
        item => item.id === id
      );
    }

    if (type === 'faction') {
      return WorldData.factions.find(
        item => item.id === id
      );
    }

    if (type === 'character') {
      return WorldData.characters.find(
        item => item.id === id
      );
    }

    if (type === 'event') {
      return WorldData.events.find(
        item => item.id === id
      );
    }

    return null;
  }

  function renderSelected() {
    const selected =
      WorldState.selectedEntity;

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

    /*
     * 切换详情内容时始终保持右侧打开。
     */
    open();

    if (
      selected.type === 'location'
    ) {
      renderLocation(item);
    }

    if (
      selected.type === 'faction'
    ) {
      renderFaction(item);
    }

    if (
      selected.type === 'character'
    ) {
      renderCharacter(item);
    }

    if (
      selected.type === 'event'
    ) {
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

    const list =
      maps[type] || [];

    return `
      <div class="detail-tabs">

        ${list
          .map(
            ([id, label]) => `
              <button
                type="button"
                class="detail-tab ${
                  WorldState.detailSubTab === id
                    ? 'active'
                    : ''
                }"
                data-detail-tab="${id}">
                ${label}
              </button>
            `
          )
          .join('')}

      </div>
    `;
  }

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

    return `
      <div class="content-page-top">

        <div class="content-page-kicker">
          ${type.toUpperCase()}
          PROFILE /
          ${item.id.toUpperCase()}
        </div>

        <div class="content-page-head">

          <div>

            <div class="content-page-title">
              ${WorldUtils.escapeHtml(
                item.name
              )}
            </div>

            <div class="content-page-subtitle">
              天启${WorldUtils.toCN(
                WorldState.currentYear
              )}年 ·
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
              border-color:${WorldUtils.hexA(
                badgeColor,
                0.35
              )};
              background:${WorldUtils.hexA(
                badgeColor,
                0.08
              )};
            ">
            ${label}
          </div>

        </div>
      </div>
    `;
  }

  function overview(
    item,
    type
  ) {
    const stats =
      item.stats || {};

    const cards =
      Object.entries(stats)
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

    const state =
      WorldMap.currentState(
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
            color:${state?.color || 'var(--gold)'};
          ">

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

  function renderShell(
    item,
    type,
    badgeColor,
    label
  ) {
    const target =
      content();

    if (!target) {
      return null;
    }

    target.innerHTML = `
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

    return document.getElementById(
      'detailBody'
    );
  }

  /*
   * 详情页子标签。
   *
   * 重点：
   * 1. stopPropagation()
   * 2. preventDefault()
   * 3. 不调用 close()
   * 4. renderSelected() 内部会保持面板打开
   */
  function wireTabs() {
    document
      .querySelectorAll(
        '.detail-tab'
      )
      .forEach(button => {
        button.type = 'button';

        button.addEventListener(
          'click',
          event => {
            event.preventDefault();
            event.stopPropagation();

            const subTab =
              button.dataset.detailTab;

            if (!subTab) {
              return;
            }

            WorldState.detailSubTab =
              subTab;

            /*
             * 重新渲染当前对象。
             * renderSelected() 会自动保持右侧打开。
             */
            renderSelected();
          },
          false
        );
      });
  }

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

    if (
      sub === 'resources'
    ) {
      body.innerHTML = `
        <div class="content-page-section">

          <div class="content-page-section-title">
            资源清单
          </div>

          <div class="content-page-list">

            ${(location.res || [])
              .map(
                resource => `
                  <span class="content-page-chip">
                    ${WorldUtils.escapeHtml(
                      resource
                    )}
                  </span>
                `
              )
              .join('')}

          </div>

        </div>
      `;
    }

    if (
      sub === 'relations'
    ) {
      body.innerHTML =
        locationRelations(
          location
        );
    }

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
                data-nav-id="${faction.id}">
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
                    data-nav-id="${character.id}">
                    ${WorldUtils.escapeHtml(
                      character.name
                    )}
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
                style="color:${faction.color}">
                ${WorldUtils.escapeHtml(
                  faction.category
                )}
              </span>

              <span class="content-page-chip">
                ${WorldUtils.escapeHtml(
                  faction.role
                )}
              </span>

            </div>

          </div>
        `;
    }

    if (
      sub === 'relations'
    ) {
      body.innerHTML =
        factionRelations(
          faction
        );
    }

    if (
      sub === 'territory'
    ) {
      body.innerHTML =
        territory(
          faction
        );
    }

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

  function factionRelations(
    faction
  ) {
    const edges =
      WorldData.factionRelations.filter(
        relation =>
          (
            relation.from ===
              faction.id ||
            relation.to ===
              faction.id
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
          edges
            .map(relation => {
              const id =
                relation.from ===
                faction.id
                  ? relation.to
                  : relation.from;

              const other =
                WorldData.factions.find(
                  item =>
                    item.id === id
                );

              return `
                <div class="content-page-stat-row">

                  <span class="content-page-stat-key">
                    ${WorldUtils.escapeHtml(
                      other?.name ||
                      id
                    )}
                  </span>

                  <span
                    class="content-page-stat-value"
                    style="
                      color:${relation.color || 'var(--gold)'};
                    ">
                    ${WorldUtils.escapeHtml(
                      relation.label
                    )}
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
                    data-nav-id="${location.id}">
                    ${WorldUtils.escapeHtml(
                      location.name
                    )}
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

    if (
      sub === 'overview'
    ) {
      body.innerHTML =
        overview(
          character,
          'character'
        );
    }

    if (
      sub === 'relations'
    ) {
      body.innerHTML =
        characterRelations(
          character
        );
    }

    if (
      sub === 'locations'
    ) {
      body.innerHTML = `
        <div class="content-page-section">

          <div class="content-page-section-title">
            相关地点
          </div>

          <div class="content-page-list">

            ${
              (
                character.locationIds ||
                []
              )
                .map(
                  id =>
                    WorldData.locations.find(
                      location =>
                        location.id ===
                        id
                    )
                )
                .filter(Boolean)
                .filter(
                  location =>
                    location.startYear <=
                    WorldState.currentYear
                )
                .map(
                  location => `
                    <button
                      type="button"
                      class="content-page-chip"
                      data-nav-type="location"
                      data-nav-id="${location.id}">
                      ${WorldUtils.escapeHtml(
                        location.name
                      )}
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

  function characterRelations(
    character
  ) {
    /*
     * 修复 || / && 优先级问题。
     */
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
            .map(relation => {
              const id =
                relation.from ===
                character.id
                  ? relation.to
                  : relation.from;

              const other =
                WorldData.characters.find(
                  item =>
                    item.id === id
                );

              return `
                <div class="content-page-stat-row">

                  <span class="content-page-stat-key">
                    ${WorldUtils.escapeHtml(
                      other?.name ||
                      id
                    )}
                  </span>

                  <span
                    class="content-page-stat-value"
                    style="
                      color:${relation.color || 'var(--gold)'};
                    ">
                    ${WorldUtils.escapeHtml(
                      relation.label
                    )}
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

  function eventsFor(
    type,
    id
  ) {
    const events =
      WorldData.events.filter(
        event => {
          const key =
            type === 'location'
              ? 'locationIds'
              : type === 'faction'
                ? 'factionIds'
                : 'characterIds';

          return (
            event[key] || []
          ).includes(id);
        }
      );

    return `
      <div class="content-page-section">

        <div class="content-page-section-title">
          相关事件
        </div>

        ${
          events
            .map(
              event => `
                <div
                  class="content-page-event"
                  data-event-id="${event.id}"
                  style="
                    border-color:${WorldUtils.hexA(
                      event.color,
                      0.45
                    )};
                  ">

                  <div
                    class="content-page-event-name"
                    style="
                      color:${event.color};
                    ">
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
                    )}年 ·
                    ${
                      event.start <=
                        WorldState.currentYear &&
                      event.end >=
                        WorldState.currentYear
                        ? '进行中'
                        : event.start >
                            WorldState.currentYear
                          ? '未发生'
                          : '已结束'
                    }
                  </div>

                  <div class="content-page-event-desc">
                    ${WorldUtils.escapeHtml(
                      event.desc
                    )}
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

  function renderEvent(
    event
  ) {
    const body =
      renderShell(
        event,
        'event',
        event.color,
        '历史事件'
      );

    if (!body) {
      return;
    }

    const sub =
      WorldState.detailSubTab;

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
              event.desc
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
          ${title}
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
                    data-nav-id="${item.id}">
                    ${WorldUtils.escapeHtml(
                      item.name
                    )}
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
    const target =
      content();

    if (!target) {
      return;
    }

    const year =
      WorldState.currentYear;

    const locationCount =
      WorldData.locations.filter(
        item =>
          WorldMap.isActive(
            item,
            year
          )
      ).length;

    const characterCount =
      WorldData.characters.filter(
        item =>
          WorldMap.isActive(
            item,
            year
          )
      ).length;

    const factionCount =
      WorldData.factions.filter(
        item =>
          WorldMap.isActive(
            item,
            year
          )
      ).length;

    const eventCount =
      WorldData.events.filter(
        event =>
          event.start <= year &&
          event.end >= year
      ).length;

    target.innerHTML = `
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
                  year
                )}年
              </div>

            </div>

            <div
              class="content-page-badge"
              style="
                color:var(--gold);
                border-color:rgba(212,167,106,.35);
                background:rgba(212,167,106,.08);
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
                  ${locationCount}/${
                    WorldData.locations.length
                  }
                </div>

              </div>

              <div class="content-page-card">

                <div class="content-page-card-label">
                  人物
                </div>

                <div class="content-page-card-value">
                  ${characterCount}/${
                    WorldData.characters.length
                  }
                </div>

              </div>

              <div class="content-page-card">

                <div class="content-page-card-label">
                  势力
                </div>

                <div class="content-page-card-value">
                  ${factionCount}/${
                    WorldData.factions.length
                  }
                </div>

              </div>

              <div class="content-page-card">

                <div class="content-page-card-label">
                  进行中事件
                </div>

                <div class="content-page-card-value">
                  ${eventCount}
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
   * 详情页内部的地点 / 人物 / 势力跳转。
   */
  document.addEventListener(
    'click',
    event => {
      const nav =
        event.target.closest(
          '[data-nav-type]'
        );

      if (nav) {
        /*
         * 这是右侧详情页内部操作，
         * 不允许它触发外部关闭逻辑。
         */
        event.preventDefault();
        event.stopPropagation();

        WorldState.select(
          nav.dataset.navType,
          nav.dataset.navId
        );

        if (
          nav.dataset.navType ===
          'location'
        ) {
          WorldMap.focusLocation(
            nav.dataset.navId
          );
        }

        return;
      }

      const eventCard =
        event.target.closest(
          '[data-event-id]'
        );

      if (eventCard) {
        event.preventDefault();
        event.stopPropagation();

        WorldState.select(
          'event',
          eventCard.dataset.eventId
        );

        return;
      }
    }
  );

  /*
   * 点击右侧信息页外部才关闭。
   */
  document.addEventListener(
    'click',
    event => {
      const side =
        sidebar();

      if (!side) {
        return;
      }

      /*
       * 没打开，不处理。
       */
      if (
        !side.classList.contains(
          'open'
        )
      ) {
        return;
      }

      /*
       * 右侧信息页内部的任何点击
       * 都不允许触发关闭。
       *
       * 特别包含：
       * 概览
       * 资源
       * 关系
       * 事件
       * 地点跳转
       * 人物跳转
       * 势力跳转
       */
      if (
        event.target.closest(
          '#mapSidebar'
        ) ||
        event.target.closest(
          '.detail-tabs'
        ) ||
        event.target.closest(
          '.detail-tab'
        ) ||
        event.target.closest(
          '[data-nav-type]'
        ) ||
        event.target.closest(
          '[data-event-id]'
        )
      ) {
        return;
      }

      /*
       * 地图地点。
       */
      if (
        event.target.closest(
          '.marker'
        ) ||
        event.target.closest(
          '[data-location-id]'
        )
      ) {
        return;
      }

      /*
       * 顶部栏。
       */
      if (
        event.target.closest(
          '.topbar'
        ) ||
        event.target.closest(
          '.tabs-wrapper'
        )
      ) {
        return;
      }

      /*
       * 时间轴。
       */
      if (
        event.target.closest(
          '.map-timeline'
        ) ||
        event.target.closest(
          '#timelineEvents'
        ) ||
        event.target.closest(
          '#timelineRange'
        ) ||
        event.target.closest(
          '#timelineTicks'
        ) ||
        event.target.closest(
          '#timelineStats'
        )
      ) {
        return;
      }

      /*
       * 地图图例。
       */
      if (
        event.target.closest(
          '.map-legend'
        )
      ) {
        return;
      }

      /*
       * 全屏信息页。
       */
      if (
        event.target.closest(
          '#infoView'
        )
      ) {
        return;
      }

      /*
       * 能走到这里，
       * 就是真正的地图空白区域。
       */
      close();
    }
  );

  function init() {
    const handle =
      document.getElementById(
        'sidebarHandle'
      );

    if (handle) {
      handle.addEventListener(
        'click',
        event => {
          /*
           * 防止 handle 的点击
           * 冒泡到全局关闭监听。
           */
          event.preventDefault();
          event.stopPropagation();

          const side =
            sidebar();

          if (!side) {
            return;
          }

          if (
            side.classList.contains(
              'open'
            )
          ) {
            close();
          } else {
            open();
          }
        }
      );
    }

    /*
     * 初始化内容。
     */
    renderWorldOverview();

    /*
     * 初始默认收起。
     */
    const side =
      sidebar();

    if (side) {
      side.classList.remove(
        'open'
      );

      side.classList.add(
        'collapsed'
      );
    }

    /*
     * 选择对象：
     * 刷新右侧详情。
     *
     * 年份改变：
     * 保持当前选中对象，
     * 更新该对象在当前年份下的状态。
     */
    WorldState.on(
      reason => {
        if (
          reason === 'selection' ||
          reason === 'year'
        ) {
          renderSelected();
        }
      }
    );
  }

  return {
    init,
    open,
    close,
    renderSelected,
    renderWorldOverview
  };
})();
