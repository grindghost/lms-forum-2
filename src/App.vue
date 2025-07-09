<template>
  <div class="min-h-screen bg-secondary font-sans text-gray-800">
    <header class="bg-white shadow p-4 flex items-center justify-between">
      <div class="text-2xl font-heading text-primary">🗨️ Forum</div>
    </header>
    
    <main class="max-w-3xl mx-auto py-8 px-4">
      <router-view />
    </main>
  </div>
</template>

<script setup>
// Nothing here yet – purely layout + <router-view />
</script>

<style scoped>
/* Optional layout styles */
</style>
