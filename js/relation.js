window.RelationUI = (() => {
  const NS = WorldUtils.svgNS;

  function active(item) {
    return WorldMap.isActive(
      item,
      WorldState.currentYear
    );
  }

  /*
   * 根据全局选中状态同步关系图。
   */
  function syncSelectionVisuals() {
    document
      .querySelectorAll(
        '.rel-node.selected'
      )
      .forEach(node => {
        node.classList.remove(
          'selected'
        );
      });

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

    if (node) {
      node.classList.add(
        'selected'
      );
    }
  }

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

    edgesBox.innerHTML = '';
    nodesBox.innerHTML = '';

    const nodeMap =
      Object.fromEntries(
        nodes.map(node => [
          node.id,
          node
        ])
      );

    /*
     * 关系线。
     */
    edges.forEach(edge => {
      const a =
        nodeMap[edge.from];

      const b =
        nodeMap[edge.to];

      if (!a || !b) {
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

      const x1 =
        a.x + ux * 16;

      const y1 =
        a.y + uy * 16;

      const x2 =
        b.x - ux * 16;

      const y2 =
        b.y - uy * 16;

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

      if (edge.dashed) {
        line.setAttribute(
          'stroke-dasharray',
          '4 3'
        );
      }

      edgesBox.appendChild(
        line
      );

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
    });

    /*
     * 节点。
     */
    nodes.forEach(node => {
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

      const group =
        document.createElementNS(
          NS,
          'g'
        );

      group.classList.add(
        'rel-node'
      );

      if (future) {
        group.classList.add(
          'future'
        );
      }

      if (ended) {
        group.classList.add(
          'rel-node-ended'
        );
      }

      group.dataset.id =
        node.id;

      group.style.color =
        node.color;

      /*
       * 光晕。
       */
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

      group.appendChild(
        halo
      );

      /*
       * 节点。
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

      group.appendChild(
        dot
      );

      /*
       * 名称。
       */
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

      group.appendChild(
        name
      );

      /*
       * 当前身份。
       */
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
          : future
            ? '尚未登场'
            : '已离场';

      group.appendChild(
        role
      );

      /*
       * 点击节点。
       *
       * 不直接操作 selected class，
       * 统一通过 WorldState。
       */
      group.addEventListener(
        'click',
        event => {
          event.stopPropagation();

          if (future) {
            showToast(
              `“${node.name}”将在天启${WorldUtils.toCN(node.startYear)}年登场`
            );

            return;
          }

          onClick(node);
        }
      );

      nodesBox.appendChild(
        group
      );
    });

    syncSelectionVisuals();
  }

  function renderAll() {
    /*
     * 势力关系。
     */
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

    /*
     * 人物关系。
     */
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

  function updateDescriptions() {
    const year =
      WorldState.currentYear;

    const activeFactions =
      window.WorldData.factions
        .filter(
          faction =>
            WorldMap.isActive(
              faction,
              year
            )
        )
        .length;

    const activeCharacters =
      window.WorldData.characters
        .filter(
          character =>
            WorldMap.isActive(
              character,
              year
            )
        )
        .length;

    const activeFactionRelations =
      window.WorldData.factionRelations
        .filter(
          relation =>
            WorldMap.isActive(
              relation,
              year
            )
        )
        .length;

    const activeCharacterRelations =
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
        `天启${WorldUtils.toCN(year)}年 · ${activeFactions}/${window.WorldData.factions.length} 个势力参与世界状态 · ${activeFactionRelations}/${window.WorldData.factionRelations.length} 条关系生效`;
    }

    const relationDesc =
      document.getElementById(
        'relationPageDesc'
      );

    if (relationDesc) {
      relationDesc.textContent =
        `天启${WorldUtils.toCN(year)}年 · ${activeCharacters}/${window.WorldData.characters.length} 位人物在场 · ${activeCharacterRelations}/${window.WorldData.characterRelations.length} 条关系生效`;
    }
  }

  function init() {
    renderAll();

    WorldState.on(
      reason => {
        if (
          reason === 'year' ||
          reason === 'selection' ||
          reason === 'selectionClear'
        ) {
          renderAll();
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
