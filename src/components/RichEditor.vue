<script setup>
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'

const editor = useEditor({
  extensions: [StarterKit, Link],
  content: '<p>Hello world</p>'
})
</script>

<template>
  <EditorContent :editor="editor" class="border p-2 rounded bg-white" />
</template>
