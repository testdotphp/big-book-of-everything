<script lang="ts">
  let { children } = $props();
</script>

<div class="book-content">
  {@render children()}
</div>

<style>
  .book-content {
    height: 100vh;
    overflow-y: auto;
    padding: 32px 40px 80px;
  }

  .book-content::-webkit-scrollbar {
    width: 6px;
  }
  .book-content::-webkit-scrollbar-track {
    background: transparent;
  }
  .book-content::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
  }

  @media (max-width: 768px) {
    .book-content {
      padding: 20px 16px;
    }
  }
</style>
