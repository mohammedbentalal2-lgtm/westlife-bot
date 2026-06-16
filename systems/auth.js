const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database');

module.exports = function(client) {

    // ==========================================
    // 1. نظام دخول الأعضاء التلقائي (رتبة ضيف والترحيب)
    // ==========================================
    client.on('guildMemberAdd', async (member) => {
        try {
            // إضافة رتبة ضيف تلقائياً
            const guestRole = member.guild.roles.cache.get(config.roles.guest);
            if (guestRole) await member.roles.add(guestRole);

            // إرسال رسالة ترحيب في روم الترحيب
            const welcomeChannel = member.guild.channels.cache.get(config.channels.welcome);
            if (welcomeChannel) {
                const welcomeEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('👋 عضو جديد في West Life')
                    .setDescription(`أهلاً بك يا ${member} في سيرفر الحياه الواقعيه الرسمي.\n\nيرجى التوجه إلى روم <#${config.channels.verifyRoom}> لبدء اختبار التفعيل الذكي ودخول المدينة!`)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();
                
                await welcomeChannel.send({ embeds: [welcomeEmbed] });
            }

            // حفظ العضو الجديد في قاعدة البيانات
            await db.User.findOneAndUpdate(
                { userId: member.id },
                { userId: member.id },
                { upsert: true, new: true }
            );

        } catch (error) {
            console.error('خطأ في نظام دخول الأعضاء:', error);
        }
    });

    // ==========================================
    // 2. أمر إرسال لوحة "إثبت نفسك" (للمطور/الإدارة)
    // ==========================================
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.content.startsWith(config.prefix)) return;

        const args = message.content.slice(config.prefix.length).trim().split(/+/);
        const command = args.shift().toLowerCase();

        // أمر إرسال زر التفعيل (يكتب مرة واحدة في روم إثبت نفسك)
        if (command === 'setup-verify-panel') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ هذا الأمر مخصص للإدارة العليا فقط.');
            }

            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('🔒 نظام إثبات الهوية والتفعيل')
                .setDescription('مرحباً بك في مرحلة التفعيل الذكي لمدينة **West Life**.\n\nللإنتقال للمرحلة القادمة وبدء اختبار القوانين الآلي، فضلاً اضغط على الزر بالأسفل لفتح تيكت التفعيل الخاص بك.')
                .setFooter({ text: 'سيرفر West Life رول بلاي' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('start_verify_ticket')
                    .setLabel('إثبت نفسك 📑')
                    .setStyle(ButtonStyle.Success)
            );

            await message.channel.send({ embeds: [embed], components: [row] });
            return message.delete();
        }
    });

    // ==========================================
    // 3. التفاعل مع زر "إثبت نفسك" وفتح تيكت الاختبار
    // ==========================================
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'start_verify_ticket') {
            await interaction.deferReply({ ephemeral: true });

            // التحقق من القائمة السوداء أولاً
            const userCheck = await db.User.findOne({ userId: interaction.user.id });
            if (userCheck && userCheck.isBlacklisted) {
                return interaction.editReply({ content: `❌ لا يمكنك التفعيل، أنت في القائمة السوداء بسبب: **${userCheck.blacklistReason}**` });
            }

            // التحقق إذا كان العضو مفعل بالفعل
            if (interaction.member.roles.cache.has(config.roles.verified)) {
                return interaction.editReply({ content: '😎 أنت مواطن مفعل في المدينة بالفعل يا بطل!' });
            }

            // التحقق من الكول داون (إذا رسب في الاختبار)
            const activeData = await db.Activation.findOne({ userId: interaction.user.id });
            if (activeData && activeData.cooldownUntil && activeData.cooldownUntil > new Date()) {
                const timeLeft = Math.ceil((activeData.cooldownUntil - new Date()) / (1000 * 60 * 60));
                return interaction.editReply({ content: `❌ لقد رسبت في الاختبار سابقاً. يمكنك إعادة المحاولة بعد **${timeLeft} ساعة**.` });
            }

            // التحقق إذا كان لديه تيكت مفتوح من قبل
            const existingTicket = await db.Ticket.findOne({ userId: interaction.user.id, type: 'activation', status: 'open' });
            if (existingTicket) {
                return interaction.editReply({ content: '⚠️ لديك تيكت تفعيل مفتوح بالفعل بالأسفل!' });
            }

            // إنشاء تيكت التفعيل تلقائياً في الـ Category المحدد
            const ticketChannel = await interaction.guild.channels.create({
                name: `تفعيل-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: config.categories.activationTickets,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: config.roles.adminAccess, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            // حفظ التيكت في قاعدة البيانات
            await db.Ticket.create({
                channelId: ticketChannel.id,
                userId: interaction.user.id,
                type: 'activation'
            });

            // تعديل رتب العضو (إزالة ضيف وإضافة غير مفعل)
            try {
                const guestRole = interaction.guild.roles.cache.get(config.roles.guest);
                const unverifiedRole = interaction.guild.roles.cache.get(config.roles.unverified);
                if (guestRole && interaction.member.roles.cache.has(guestRole.id)) await interaction.member.roles.remove(guestRole);
                if (unverifiedRole) await interaction.member.roles.add(unverifiedRole);
            } catch (err) {
                console.log('خطأ أثناء تحديث رتب التفعيل البدئي:', err);
            }

            // إرسال رسالة ترحيبية داخل التيكت وبدء السؤال الأول
            const startEmbed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setTitle('📥 تيكت التفعيل الذكي')
                .setDescription(`مرحباً بك يا <@${interaction.user.id}> في تيكت التفعيل الخاص بك.\n\nسيقوم البوت الآن بطرح **10 أسئلة** متعلقة بقوانين FiveM العامة لتقييم مستواك.\nنسبة النجاح المطلوبة هي **${config.activationSettings.successRate}%**.\n\nاضغط على الزر بالأسفل للبدء فوراً!`);

            const startRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`quiz_start_${interaction.user.id}`)
                    .setLabel('ابدأ الاختبار الآن 🚀')
                    .setStyle(ButtonStyle.Primary)
            );

            await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [startEmbed], components: [startRow] });
            await interaction.editReply({ content: `✅ تم فتح تيكت التفعيل الخاص بك بنجاح: <#${ticketChannel.id}>` });
        }
    });
};
