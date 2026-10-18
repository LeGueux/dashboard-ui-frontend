<template>
  <div data-layout="dossiers" class="station-directory-layout">
    <div class="weather-workspace">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* Le répertoire garde ses dossiers sans déplacer le choix mémorisé des marchés. */
.station-directory-layout { --layout-toolbar-height: 0px; }
</style>
