import { Plugin } from 'obsidian';

const implodeRegex = /^([^-+*#\n\r][^\n\r]+)( *)(\n)(?!\n|$)/mg;
const explodeRegex = /([\.!\?])( +)(?!\n)/g;

export default class MyPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: "explode-paragraph-implode",
			name: "Implode paragraphs",
			editorCallback: (editor) => {
				const text = editor.getValue();
				editor.setValue(text.replace(implodeRegex, "$1 "))
			}
		})

		this.addCommand({
			id: "explode-paragraph-explode",
			name: "Explode paragraphs",
			editorCallback: (editor) => {
				const text = editor.getValue();
				editor.setValue(text.replace(explodeRegex, "$1\n"))
			}
		})
	}
}
