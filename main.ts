import { Plugin, moment, Notice } from 'obsidian';

export default class AssistantFlowPlugin extends Plugin {
    async onload() {
        this.addCommand({
            id: 'generate-assistant-report',
            name: 'Создать аналитический отчет за неделю',
            callback: () => this.generateReport(),
        });
    }

    async generateReport() {
        const files = this.app.vault.getMarkdownFiles();
        const sevenDaysAgo = moment().subtract(7, 'days').valueOf();

        let totalWords = 0;
        let completedTasks = 0;
        let openTasks = 0;
        const tagCounts: Record<string, number> = {};

        const recentFiles = files.filter(file => file.stat.mtime >= sevenDaysAgo);

        if (recentFiles.length === 0) {
            new Notice('За последние 7 дней нет измененных заметок!');
            return;
        }

        new Notice('Анализирую заметки...');

        for (const file of recentFiles) {
            const content = await this.app.vault.read(file);
            const words = content.match(/\b\w+\b/g);
            if (words) totalWords += words.length;

            const tasks = content.match(/-\s\[([ xX])\]/g);
            if (tasks) {
                tasks.forEach(task => {
                    if (task.includes('x') || task.includes('X')) completedTasks++;
                    else openTasks++;
                });
            }

            const tags = content.match(/(?<=^|\s)#[a-zA-Zа-яА-Я0-9_]+/g);
            if (tags) {
                tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        }

        const topTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const reportDate = moment().format('YYYY-MM-DD_HH-mm');
        const reportTitle = `Аналитический отчет за неделю (${moment().format('DD.MM.YYYY')})`;

        let reportContent = `# Аналитика: ${reportTitle}\n\n`;
        reportContent += `**Проанализировано заметок:** ${recentFiles.length}\n`;
        reportContent += `**Написано слов за неделю:** ${totalWords}\n\n`;
        reportContent += `## Активность по задачам\n`;
        reportContent += `- Завершено задач: **${completedTasks}**\n`;
        reportContent += `- Осталось в планах: **${openTasks}**\n\n`;

        if (completedTasks > 0 || openTasks > 0) {
            reportContent += `### Визуализация\n`;
            reportContent += '```mermaid\n';
            reportContent += `pie title Соотношение статусов задач\n`;
            reportContent += `    "Выполнено" : ${completedTasks}\n`;
            reportContent += `    "Осталось" : ${openTasks}\n`;
            reportContent += '```\n\n';
        }

        reportContent += `## Ключевые фокусы (Топ-5 тегов)\n`;
        if (topTags.length > 0) {
            topTags.forEach(([tag, count]) => {
                reportContent += `- **${tag}**: ${count} упоминаний\n`;
            });
        }

        const fileName = `Отчет_${reportDate}.md`;
        const newFile = await this.app.vault.create(fileName, reportContent);
        await this.app.workspace.getLeaf(true).openFile(newFile);
        new Notice('Отчет успешно сгенерирован!');
    }}