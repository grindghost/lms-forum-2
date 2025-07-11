<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'

// Import SVG icons
import BoldIcon from '@/assets/rte-controls/bold.svg'
import ItalicIcon from '@/assets/rte-controls/italic.svg'
import UnderlineIcon from '@/assets/rte-controls/underline.svg'
import AlignLeftIcon from '@/assets/rte-controls/align-left.svg'
import AlignCenterIcon from '@/assets/rte-controls/align-center.svg'
import AlignRightIcon from '@/assets/rte-controls/align-right.svg'
import UlIcon from '@/assets/rte-controls/ol.svg'
import OlIcon from '@/assets/rte-controls/ul.svg'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Write something...' },
  charLimit: { type: Number, default: 4000 },
  /**
   * maxHeight: Maximum height for the editor content area (e.g., '220px').
   * Use a smaller value for replies, larger for new posts.
   */
  maxHeight: { type: String, default: '220px' }
})
const emit = defineEmits(['update:modelValue'])

const editor = ref(null)
const linkUrl = ref('')
const showLinkInput = ref(false)

// Character count logic
const plainText = ref('')
const charCount = computed(() => plainText.value.length)
const charLimit = computed(() => props.charLimit)
const isOverLimit = computed(() => charCount.value > charLimit.value)

onMounted(() => {
  editor.value = new Editor({
    content: props.modelValue,
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        codeBlock: true,
        heading: {
          levels: [1, 2]
        }
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer'
        }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'listItem']
      })
    ],
    editorProps: {
      attributes: {
        class: 'prose min-h-[80px] p-3 bg-white rounded-b border-t-0 focus:outline-none'
      }
    },
    onUpdate({ editor }) {
      // Get plain text for char count
      plainText.value = editor.getText()
      // Prevent input if over limit
      if (plainText.value.length > charLimit.value) {
        // Remove extra characters
        const truncated = plainText.value.slice(0, charLimit.value)
        editor.commands.setContent(truncated)
        plainText.value = truncated
        emit('update:modelValue', editor.getHTML())
      } else {
        emit('update:modelValue', editor.getHTML())
      }
    }
  })
  // Initialize char count
  plainText.value = editor.value.getText()
})

watch(() => props.modelValue, (val) => {
  if (editor.value && val !== editor.value.getHTML()) {
    editor.value.commands.setContent(val)
    plainText.value = editor.value.getText()
  }
})

onBeforeUnmount(() => {
  if (editor.value) editor.value.destroy()
})

// Toolbar functions
const toggleBold = () => editor.value.chain().focus().toggleBold().run()
const toggleItalic = () => editor.value.chain().focus().toggleItalic().run()
const toggleUnderline = () => editor.value.chain().focus().toggleUnderline().run()
const toggleBulletList = () => {
  editor.value.chain().focus().toggleBulletList().run()
}
const toggleOrderedList = () => {
  editor.value.chain().focus().toggleOrderedList().run()
}
const setTextAlign = (align) => editor.value.chain().focus().setTextAlign(align).run()

const addLink = () => {
  if (linkUrl.value) {
    editor.value.chain().focus().setLink({ href: linkUrl.value }).run()
    linkUrl.value = ''
    showLinkInput.value = false
  }
}

const removeLink = () => {
  editor.value.chain().focus().unsetLink().run()
}

const isActive = (type, options = {}) => {
  return editor.value?.isActive(type, options) || false
}

// New: Heading and Code Block controls
const setHeading = (level) => editor.value.chain().focus().toggleHeading({ level }).run()
const toggleCodeBlock = () => editor.value.chain().focus().toggleCodeBlock().run()
</script>

<template>
  <div class="rich-editor-container border rounded-lg overflow-hidden relative">
    <!-- Toolbar -->
    <div class="bg-gray-50 border-b px-3 py-2 flex flex-wrap items-center gap-1">
      <!-- Headings and Code Block -->
      <div class="flex items-center gap-1 border-r pr-2 mr-2">
        <button
          @click="setHeading(1)"
          :class="['toolbar-btn', isActive('heading', { level: 1 }) ? 'toolbar-btn-active' : '']"
          title="Heading 1"
        >
          H1
        </button>
        <button
          @click="setHeading(2)"
          :class="['toolbar-btn', isActive('heading', { level: 2 }) ? 'toolbar-btn-active' : '']"
          title="Heading 2"
        >
          H2
        </button>
        <button
          @click="toggleCodeBlock"
          :class="['toolbar-btn', isActive('codeBlock') ? 'toolbar-btn-active' : '']"
          title="Code Block"
        >
          <span class="font-mono text-base">&lt;&gt;</span>
        </button>
      </div>
      <!-- Text Formatting -->
      <div class="flex items-center gap-1 border-r pr-2 mr-2">
        <button
          @click="toggleBold"
          :class="['toolbar-btn', isActive('bold') ? 'toolbar-btn-active' : '']"
          title="Bold"
        >
          <img :src="BoldIcon" alt="Bold" class="w-4 h-4" />
        </button>
        <button
          @click="toggleItalic"
          :class="['toolbar-btn', isActive('italic') ? 'toolbar-btn-active' : '']"
          title="Italic"
        >
          <img :src="ItalicIcon" alt="Italic" class="w-4 h-4" />
        </button>
        <button
          @click="toggleUnderline"
          :class="['toolbar-btn', isActive('underline') ? 'toolbar-btn-active' : '']"
          title="Underline"
        >
          <img :src="UnderlineIcon" alt="Underline" class="w-4 h-4" />
        </button>
      </div>

      <!-- Text Alignment -->
      <div class="flex items-center gap-1 border-r pr-2 mr-2">
        <button
          @click="setTextAlign('left')"
          :class="['toolbar-btn', isActive({ textAlign: 'left' }) ? 'toolbar-btn-active' : '']"
          title="Align Left"
        >
          <img :src="AlignLeftIcon" alt="Align Left" class="w-4 h-4" />
        </button>
        <button
          @click="setTextAlign('center')"
          :class="['toolbar-btn', isActive({ textAlign: 'center' }) ? 'toolbar-btn-active' : '']"
          title="Align Center"
        >
          <img :src="AlignCenterIcon" alt="Align Center" class="w-4 h-4" />
        </button>
        <button
          @click="setTextAlign('right')"
          :class="['toolbar-btn', isActive({ textAlign: 'right' }) ? 'toolbar-btn-active' : '']"
          title="Align Right"
        >
          <img :src="AlignRightIcon" alt="Align Right" class="w-4 h-4" />
        </button>
      </div>

      <!-- Lists -->
      <div class="flex items-center gap-1 border-r pr-2 mr-2">
        <button
          @click="toggleBulletList"
          :class="['toolbar-btn', isActive('bulletList') ? 'toolbar-btn-active' : '']"
          title="Bullet List"
        >
          <img :src="UlIcon" alt="Bullet List" class="w-4 h-4" />
        </button>
        <button
          @click="toggleOrderedList"
          :class="['toolbar-btn', isActive('orderedList') ? 'toolbar-btn-active' : '']"
          title="Numbered List"
        >
          <img :src="OlIcon" alt="Numbered List" class="w-4 h-4" />
        </button>
      </div>

      <!-- Link -->
      <div class="flex items-center gap-1">
        <button
          v-if="!showLinkInput"
          @click="showLinkInput = true"
          :class="['toolbar-btn', isActive('link') ? 'toolbar-btn-active' : '']"
          title="Add Link"
        >
          🔗
        </button>
        <button
          v-if="isActive('link')"
          @click="removeLink"
          class="toolbar-btn toolbar-btn-remove-link"
          title="Remove Link"
        >
          Remove link
        </button>
      </div>

      <!-- Link Input -->
      <div v-if="showLinkInput" class="flex items-center gap-1 ml-2">
        <input
          v-model="linkUrl"
          type="url"
          placeholder="Enter URL..."
          class="input input-xs input-bordered"
          @keyup.enter="addLink"
          @keyup.esc="showLinkInput = false"
        />
        <button @click="addLink" class="btn btn-xs btn-primary">Add</button>
        <button @click="showLinkInput = false" class="btn btn-xs btn-outline">Cancel</button>
      </div>
    </div>

    <!-- Editor Content (scrollable area) -->
    <div class="editor-scroll-area" :style="{ maxHeight: props.maxHeight }">
      <EditorContent :editor="editor" />
    </div>
    <!-- Character Count -->
    <div class="char-count-sticky">
      <span :class="isOverLimit ? 'text-red-600 font-bold' : 'text-gray-400'">
        {{ charCount }} / {{ charLimit }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.rich-editor-container {
  padding-bottom: 1rem;
}

.editor-scroll-area {
  flex: 1 1 auto;
  overflow-y: auto;
  /* max-height removed, now dynamic via prop */
}

.rich-editor-container :deep(.ProseMirror) {
  outline: none;
}

.rich-editor-container :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: #adb5bd;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.rich-editor-container :deep(.ProseMirror ul) {
  list-style-type: disc;
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.rich-editor-container :deep(.ProseMirror ol) {
  list-style-type: decimal;
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.rich-editor-container :deep(.ProseMirror li) {
  margin: 0.25em 0;
}

/* Custom toolbar button styles */
.toolbar-btn {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.5rem;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #374151;
}

.toolbar-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.toolbar-btn-active {
  background: white;
  border-color: #374151;
  border-width: 1.5px;
  color: #374151;
}

.toolbar-btn-active:hover {
  background: #f9fafb;
  border-color: #1f2937;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.toolbar-btn-remove-link {
  background: white;
  border-color: #ef4444;
  border-width: 1.5px;
  color: #ef4444;
  width: auto;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.toolbar-btn-remove-link:hover {
  background: #fef2f2;
  border-color: #dc2626;
  color: #dc2626;
  box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.1), 0 2px 4px -1px rgba(239, 68, 68, 0.06);
}

/* Icon styling */
.toolbar-btn img {
  filter: brightness(0) saturate(100%);
  transition: filter 0.2s ease;
}

.toolbar-btn-active img {
  filter: brightness(0) saturate(100%);
}

.toolbar-btn-error img {
  filter: brightness(0) saturate(100%) invert(1);
}

.char-count-sticky {
  position: absolute;
  width: 100%;
  text-align: right;
  right: 1rem;
  bottom: 0.5rem;
  padding: 0.15rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.85em;
  pointer-events: none;
  z-index: 10;
  background: linear-gradient(0deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 1) 61%, rgba(255, 255, 255, 0) 100%);
}
</style>