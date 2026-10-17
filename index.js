
const {
  Client, GatewayIntentBits, Events, EmbedBuilder, AttachmentBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType,
  PermissionsBitField, REST, Routes
} = require("discord.js");
const path = require("node:path");

const ID = {
  guild: process.env.GUILD_ID,
  welcome: "1525643339699847178",
  autoRole: "1532611461245964389",

  ticketPanel: "1553140280742510622",
  ticketCategory: "1553139841007620267",
  ticketStaff: "1556821008927948810",
  ticketLogs: "1556953848512516137",

  applicationPanel: "1550783900261818468",
  applicationReview: "1550783950060789880",
  acceptedRole: "1550780555753299968",
  applicationStaff: "1561063867700879462",
  applicationLogs: "1556953724608446496"
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const banners = {
  welcome: path.join(__dirname, "welcome-banner.png"),
  application: path.join(__dirname, "application-banner.png"),
  ticket: path.join(__dirname, "ticket-banner.png")
};

const colors = {
  gold: 0xD9A441,
  red: 0xC62828,
  green: 0x2E7D32,
  blue: 0x1565C0
};

function makeEmbed(color = colors.gold) {
  return new EmbedBuilder().setColor(color).setTimestamp();
}

function isAdmin(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function hasRole(member, roleId) {
  return Boolean(roleId && member.roles.cache.has(roleId));
}

async function sendLog(channelId, messageEmbed) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel?.isTextBased()) {
      await channel.send({ embeds: [messageEmbed] });
    }
  } catch (error) {
    console.error("Log error:", error.message);
  }
}

function bannerFile(filePath, filename) {
  return new AttachmentBuilder(filePath, { name: filename });
}

async function sendPanel(channelId, payload) {
  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased()) {
    throw new Error(`القناة ${channelId} غير موجودة أو ليست قناة نصية.`);
  }
  await channel.send(payload);
}

// ==================== لوحة التذاكر ====================

function ticketPanel() {
  const file = bannerFile(banners.ticket, "ticket-banner.png");

  const panel = makeEmbed(colors.red)
    .setTitle("🎫 نظام التذاكر | BARAKAT COMMUNITY")
    .setDescription(
      "اختر نوع التذكرة المناسبة لك من القائمة بالأسفل.\n\n" +
      "🛠️ **الدعم الفني** — للمشاكل والاستفسارات.\n" +
      "🎬 **الإيديتور** — للتقديم لفريق الإيديت.\n" +
      "⚠️ **الشكاوى** — لتقديم شكوى.\n" +
      "📺 **طلبات الستريم** — لطلبات الستريم.\n" +
      "➕ **طلب آخر** — لأي طلب آخر.\n\n" +
      "يرجى اختيار القسم المناسب قبل فتح التذكرة."
    )
    .setImage("attachment://ticket-banner.png");

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_type")
    .setPlaceholder("اختر نوع التذكرة...")
    .addOptions(
      { label: "الدعم الفني", value: "support", emoji: "🛠️" },
      { label: "تقديم إيديتور", value: "editor", emoji: "🎬" },
      { label: "شكاوى", value: "complaint", emoji: "⚠️" },
      { label: "طلبات الستريم", value: "stream", emoji: "📺" },
      { label: "طلب آخر", value: "other", emoji: "➕" }
    );

  return {
    files: [file],
    embeds: [panel],
    components: [new ActionRowBuilder().addComponents(menu)]
  };
}

// ==================== لوحة تقديم المود ====================

function applicationPanel() {
  const file = bannerFile(
    banners.application,
    "application-banner.png"
  );

  const panel = makeEmbed()
    .setTitle("👑 تقديم مود الاستريم | BARAKAT COMMUNITY")
    .setDescription(
      "حابب تنضم لفريق مود الاستريم؟\n" +
      "اضغط على **ابدأ التقديم** وأجب عن الأسئلة بوضوح.\n\n" +
      "سيتم إرسال طلبك للإدارة للمراجعة، وسيتم إبلاغك بالقرار."
    )
    .setImage("attachment://application-banner.png");

  const button = new ButtonBuilder()
    .setCustomId("apply_stream_mod")
    .setLabel("ابدأ التقديم")
    .setEmoji("📝")
    .setStyle(ButtonStyle.Primary);

  return {
    files: [file],
    embeds: [panel],
    components: [new ActionRowBuilder().addComponents(button)]
  };
}

// ==================== فتح التذكرة ====================

async function createTicket(interaction, type) {
  const guild = interaction.guild;

  const names = {
    support: "دعم-فني",
    editor: "تقديم-إيديتور",
    complaint: "شكوى",
    stream: "طلبات-ستريم",
    other: "طلب-آخر"
  };

  const labels = {
    support: "الدعم الفني",
    editor: "تقديم إيديتور",
    complaint: "شكوى",
    stream: "طلبات الستريم",
    other: "طلب آخر"
  };

  const existing = guild.channels.cache.find(channel =>
    channel.type === ChannelType.GuildText &&
    channel.parentId === ID.ticketCategory &&
    channel.topic?.includes(`ticket-owner:${interaction.user.id};`)
  );

  if (existing) {
    return interaction.reply({
      content: `عندك تذكرة مفتوحة بالفعل: ${existing}`,
      ephemeral: true
    });
  }

  const channel = await guild.channels.create({
    name: `${names[type]}-${interaction.user.username}`
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF-]/g, "-")
      .slice(0, 90),
    type: ChannelType.GuildText,
    parent: ID.ticketCategory,
    topic: `ticket-owner:${interaction.user.id};ticket-type:${type}`,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles
        ]
      },
      {
        id: ID.ticketStaff,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageMessages
        ]
      },
      {
        id: client.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageChannels
        ]
      }
    ]
  });

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("استلام التذكرة")
      .setEmoji("🧑‍💼")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("إغلاق التذكرة")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: `${interaction.user} <@&${ID.ticketStaff}>`,
    embeds: [
      makeEmbed(colors.red)
        .setTitle(`🎫 ${labels[type]}`)
        .setDescription(
          `أهلًا ${interaction.user}!\n` +
          "اكتب تفاصيل طلبك هنا وسيقوم فريق الإدارة بمساعدتك.\n\n" +
          `**صاحب التذكرة:** ${interaction.user}\n` +
          "**الحالة:** مفتوحة"
        )
    ],
    components: [buttons]
  });

  await interaction.reply({
    content: `تم فتح تذكرتك بنجاح: ${channel}`,
    ephemeral: true
  });

  await sendLog(
    ID.ticketLogs,
    makeEmbed(colors.green)
      .setTitle("🎫 تم فتح تذكرة")
      .setDescription(
        `**العضو:** ${interaction.user} (\`${interaction.user.id}\`)\n` +
        `**النوع:** ${labels[type]}\n` +
        `**القناة:** ${channel}`
      )
  );
}

// ==================== تقديم مود الاستريم ====================

async function showApplicationForm(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("stream_mod_application")
    .setTitle("تقديم مود الاستريم");

  const questions = [
    ["العمر", "age", TextInputStyle.Short, 100],
    ["اسمك داخل السيرفر", "server_name", TextInputStyle.Short, 100],
    ["خبرتك في الإشراف", "experience", TextInputStyle.Paragraph, 900],
    ["أوقات تواجدك", "availability", TextInputStyle.Paragraph, 500],
    ["لماذا تريد الانضمام؟", "reason", TextInputStyle.Paragraph, 900]
  ];

  for (const [label, id, style, maxLength] of questions) {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(id)
          .setLabel(label)
          .setStyle(style)
          .setRequired(true)
          .setMaxLength(maxLength)
      )
    );
  }

  await interaction.showModal(modal);
}

async function receiveApplication(interaction) {
  const applicant = interaction.user;

  const answers = [
    ["العمر", "age"],
    ["اسم السيرفر", "server_name"],
    ["الخبرة", "experience"],
    ["أوقات التواجد", "availability"],
    ["سبب التقديم", "reason"]
  ];

  const review = makeEmbed()
    .setTitle("📝 طلب مود استريم جديد")
    .setDescription(
      `**المتقدم:** ${applicant} (\`${applicant.id}\`)\n` +
      "**الحالة:** قيد المراجعة"
    );

  for (const [label, id] of answers) {
    review.addFields({
      name: label,
      value: interaction.fields.getTextInputValue(id) || "—"
    });
  }

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`application_accept:${applicant.id}`)
      .setLabel("قبول مبدئي")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`application_reject:${applicant.id}`)
      .setLabel("رفض")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
  );

  const reviewChannel = await client.channels.fetch(ID.applicationReview);

  if (!reviewChannel?.isTextBased()) {
    return interaction.reply({
      content: "أيدي قناة مراجعة التقديمات غير صحيح. تأكد أنها قناة نصية.",
      ephemeral: true
    });
  }

  await reviewChannel.send({
    embeds: [review],
    components: [buttons]
  });

  await interaction.reply({
    content: "تم إرسال تقديمك للإدارة بنجاح. بالتوفيق!",
    ephemeral: true
  });

  await sendLog(
    ID.applicationLogs,
    makeEmbed()
      .setTitle("📝 تقديم جديد")
      .setDescription(
        `**المتقدم:** ${applicant} (\`${applicant.id}\`)\n` +
        `**قناة المراجعة:** ${reviewChannel}`
      )
  );
}

// ==================== تشغيل البوت والأوامر ====================

client.once(Events.ClientReady, async () => {
  console.log(`تم تشغيل البوت: ${client.user.tag}`);

  const commands = [
    {
      name: "setup-welcome",
      description: "إرسال بانر الترحيب"
    },
    {
      name: "setup-tickets",
      description: "إرسال لوحة التذاكر"
    },
    {
      name: "setup-application",
      description: "إرسال لوحة تقديم مود الاستريم"
    }
  ];

  try {
    const rest = new REST({ version: "10" })
      .setToken(process.env.DISCORD_TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        ID.guild
      ),
      { body: commands }
    );

    console.log("تم تسجيل أوامر البوت.");
  } catch (error) {
    console.error("تعذر تسجيل الأوامر:", error);
  }
});

// ==================== ترحيب ورول تلقائي ====================

client.on(Events.GuildMemberAdd, async member => {
  try {
    await member.roles.add(ID.autoRole);
  } catch (error) {
    console.error("تعذر إعطاء الرول:", error.message);
  }

  try {
    const channel = await client.channels.fetch(ID.welcome);
    if (!channel?.isTextBased()) return;

    const file = bannerFile(banners.welcome, "welcome-banner.png");

    await channel.send({
      content:
        `أهلًا وسهلًا ${member} في **BARAKAT COMMUNITY** ❤️\n` +
        "نتمنى منك قراءة القوانين والاستمتاع بوقتك معانا.",
      files: [file],
      embeds: [
        makeEmbed()
          .setTitle("👑 أهلًا وسهلًا بك في BARAKAT COMMUNITY")
          .setDescription(`نورت السيرفر يا ${member}!`)
          .setImage("attachment://welcome-banner.png")
      ]
    });
  } catch (error) {
    console.error("تعذر إرسال الترحيب:", error.message);
  }
});

// ==================== التفاعلات ====================

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          content: "الأوامر دي للمسؤولين فقط.",
          ephemeral: true
        });
      }

      if (interaction.commandName === "setup-welcome") {
        const file = bannerFile(banners.welcome, "welcome-banner.png");
        const channel = await client.channels.fetch(ID.welcome);

        if (!channel?.isTextBased()) {
          return interaction.reply({
            content: "أيدي قناة الترحيب غير صحيح.",
            ephemeral: true
          });
        }

        await channel.send({
          files: [file],
          embeds: [
            makeEmbed()
              .setTitle("👑 BARAKAT COMMUNITY")
              .setDescription("أهلًا بيكم في مجتمع بركات! نتمنى من الجميع قراءة القوانين.")
              .setImage("attachment://welcome-banner.png")
          ]
        });

        return interaction.reply({
          content: "تم إرسال بانر الترحيب.",
          ephemeral: true
        });
      }

      if (interaction.commandName === "setup-tickets") {
        await sendPanel(ID.ticketPanel, ticketPanel());
        return interaction.reply({
          content: "تم إرسال لوحة التذاكر.",
          ephemeral: true
        });
      }

      if (interaction.commandName === "setup-application") {
        await sendPanel(ID.applicationPanel, applicationPanel());
        return interaction.reply({
          content: "تم إرسال لوحة التقديم.",
          ephemeral: true
        });
      }
    }

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "ticket_type"
    ) {
      return createTicket(interaction, interaction.values[0]);
    }

    if (
      interaction.isButton() &&
      interaction.customId === "apply_stream_mod"
    ) {
      return showApplicationForm(interaction);
    }

    if (
      interaction.isModalSubmit() &&
      interaction.customId === "stream_mod_application"
    ) {
      return receiveApplication(interaction);
    }

    if (
      interaction.isButton() &&
      ["ticket_claim", "ticket_close"].includes(interaction.customId)
    ) {
      const channel = interaction.channel;
      const staff =
        isAdmin(interaction.member) ||
        hasRole(interaction.member, ID.ticketStaff);

      if (!staff) {
        return interaction.reply({
          content: "الأزرار دي مخصصة لفريق التذاكر.",
          ephemeral: true
        });
      }

      const ownerId =
        channel.topic?.match(/ticket-owner:(\d+)/)?.[1] || "غير معروف";

      if (interaction.customId === "ticket_claim") {
        await interaction.reply({
          content: `تم استلام التذكرة بواسطة ${interaction.user}.`
        });

        await sendLog(
          ID.ticketLogs,
          makeEmbed(colors.blue)
            .setTitle("🧑‍💼 تم استلام تذكرة")
            .setDescription(
              `**المستلم:** ${interaction.user} (\`${interaction.user.id}\`)\n` +
              `**صاحب التذكرة:** <@${ownerId}>\n` +
              `**القناة:** ${channel}`
            )
        );
      } else {
        await interaction.reply({
          content: "سيتم إغلاق التذكرة خلال لحظات."
        });

        await sendLog(
          ID.ticketLogs,
          makeEmbed(colors.red)
            .setTitle("🔒 تم إغلاق تذكرة")
            .setDescription(
              `**أغلقها:** ${interaction.user} (\`${interaction.user.id}\`)\n` +
              `**صاحب التذكرة:** <@${ownerId}>\n` +
              `**القناة:** ${channel}`
            )
        );

        setTimeout(() => {
          channel.delete("Ticket closed by staff").catch(console.error);
        }, 3000);
      }
    }

    if (
      interaction.isButton() &&
      (interaction.customId.startsWith("application_accept:") ||
       interaction.customId.startsWith("application_reject:"))
    ) {
      const allowed =
        isAdmin(interaction.member) ||
        hasRole(interaction.member, ID.applicationStaff);

      if (!allowed) {
        return interaction.reply({
          content: "الأزرار دي مخصصة لفريق مراجعة التقديمات.",
          ephemeral: true
        });
      }

      const [action, applicantId] = interaction.customId.split(":");
      const accepted = action === "application_accept";

      const review = EmbedBuilder.from(interaction.message.embeds[0]);
      review.setColor(accepted ? colors.green : colors.red);
      review.setDescription(
        (review.data.description || "").replace(
          "قيد المراجعة",
          accepted
            ? `مقبول مبدئيًا بواسطة ${interaction.user}`
            : `مرفوض بواسطة ${interaction.user}`
        )
      );

      await interaction.update({
        embeds: [review],
        components: []
      });

      if (accepted) {
        try {
          const member = await interaction.guild.members.fetch(applicantId);
          await member.roles.add(ID.acceptedRole);
          await member.send(
            "مبروك! تم قبولك مبدئيًا في تقديم مود الاستريم في BARAKAT COMMUNITY."
          ).catch(() => {});
        } catch (error) {
          console.error("تعذر إعطاء رول القبول:", error.message);
        }
      } else {
        try {
          const member = await interaction.guild.members.fetch(applicantId);
          await member.send(
            "شكرًا لتقديمك في BARAKAT COMMUNITY. نعتذر، لم يتم قبول طلبك هذه المرة."
          ).catch(() => {});
        } catch {}
      }

      await sendLog(
        ID.applicationLogs,
        makeEmbed(accepted ? colors.green : colors.red)
          .setTitle(accepted ? "✅ تم قبول تقديم" : "❌ تم رفض تقديم")
          .setDescription(
            `**المراجع:** ${interaction.user} (\`${interaction.user.id}\`)\n` +
            `**المتقدم:** <@${applicantId}>\n` +
            `**القرار:** ${accepted ? "قبول مبدئي" : "رفض"}`
          )
      );
    }
  } catch (error) {
    console.error("Interaction error:", error);

    const reply = {
      content: "حصل خطأ. تأكد من الأيديهات وصلاحيات البوت.",
      ephemeral: true
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
  console.error("أضف DISCORD_TOKEN و CLIENT_ID و GUILD_ID في Railway Variables.");
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
