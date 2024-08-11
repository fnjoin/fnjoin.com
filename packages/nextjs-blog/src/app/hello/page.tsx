import Image from "next/image";
import React, { ReactNode } from "react";

export default function HelloPage(): ReactNode {
    const str = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor.
    Cras vestibulum bibendum augue. Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Aliquam nibh. Mauris ac mauris sed pede pellentesque fermentum. Maecenas adipiscing ante non diam sodales hendrerit.
    Ut velit mauris, egestas sed, gravida nec, ornare ut, mi. Aenean ut orci vel massa suscipit pulvinar. Nulla sollicitudin. Fusce varius, ligula non tempus aliquam, nunc turpis ullamcorper nibh, in tempus sapien eros ac ligula. Pellentesque rhoncus nunc et augue. Integer id felis. Curabitur aliquet pellentesque diam. Integer quis metus vitae elit lobortis egestas. Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Morbi vel erat non mauris convallis vehicula.
    Nulla et sapien. Integer tortor tellus, aliquam faucibus, convallis id, congue eu, quam. Mauris ullamcorper felis vitae erat. Proin feugiat, augue non elementum posuere, metus pede iaculis mi, in tempus lorem neque eget apibus. Morbi lacus dui, pulvinar sed, laoreet ac, malesuada eget, lorem. Nunc non feugiat mi. Donec imperdiet. Donec sed mi. Aliquam erat volutpat. Maecenas fermentum, sem in pharetra pellentesque, velit turpis volutpat ante, in pharetra metus odio a lectus.
    Sed lobortis. Sed ac sem ut orci luctus eleifend. Nunc elementum leo eu felis. Etiam bibendum, enim honestly laoreet vulputate, tortor felis imperdiet arcu, at dictum massa risus ac lacus. Fusce pulvinar dolor ac diam mattis varius. Nunc iaculis, nibh non iaculis aliquam, orci orci sollicitudin ipsum, vel hendrerit nuncullamcorper felis. Morbi condimentum mauris et dolor. Pellentesque habitans morbi tristique senectus et netus et malesuada fames ac turpis egestas. Proin mattis lacinia augue.
    Vestibulum leo pede, ullamcorper nec, tempor ac, imperdiet non, erat. Nulla pulvinar eleifend sem. Ut rutrum vel orci vel imperdiet. Nunc venenatis enim nec quam. Curabitur vel erat nec pede pretium elementum. Nunc auctor odio. Phasellus enim ante, dapibus in, viverra quis, feugiat a, tellus. Nunc cursus imperdiet nunc. Integer rutrum, orci vestibulum ullamcorper ultricies, lacus quam ultricies odio, vitae placerat pede sem sit amet enim.
    Donec commapellentesque lectus non sapien laoreet aliquam est vitae risus. Duis tempus quoties metus commodo blandit. Duis pulvinar, est et risus sagittis semper. Sed volutpat orci quis nisi. Nullam nec sem vel ipsum euismod pellentesque. Sed dui orci, facilisis sed, pharetra semper, placerat vel, justo. Cras sollicitudin adipiscing eros. Vestibulum eget orci.
    Suspendisse potentiis elementum tincidunt tortor. Mauris in eros ac augue porttitor consequat. Praesent faucibus blandit enim. Fusce eget felis in augue vehicula blandit. Integer vel augue. Nam ut leo. Suspendisse pede augue, gravida et, facilisis quis, convallis sit amet, magna. Nam luctus, felis nec volutpat tincidunt, erat enim pharetra mi, vel imperdiet lectus ipsum a sapien. Mauris dolor erat, commodo venenatis, eleifend eget, porta nec, erat.
    Morbi lacinia, lorem non malesuada faucibus, erat nisl eleifend dolor, sed lacinia ligula turpis vel erat. Nulla justo enim, consectetuer nec, ullamcorper ac, vestibulum in, tellus. Cras pellentesque augue sed tellus convallis ultrices. Nullam rhoncus aliquam metus. Phasellus fauctor sollicitudin justo. Sed etiam erat velit, pretiumid mimet, molestie eu, feugiat quis, erat. Nam blandit odio sed tellus tempor congue. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos hymenaeos.`;
    const paragraphs = str.split("\n").map((x) => {
        // strip the whitespace from the ends
        return x.trim();
    });

    //https://tailwindflex.com/@team-tailwindflex/hastags-pills

    return (
        <div className="prose max-w-none grid grid-cols-1 md:grid-cols-12 grid-flow-row gap-1">
            <div className="m-2 col-start-3 col-end-8 col-span-6">
                <div className="flex gap-1 flex-wrap text-sm justify-center">
                    <span>Tags:</span>
                    <span className="bg-gray-100 rounded-full px-3 font-semibold text-gray-600">
                        #photography
                    </span>
                    <span className="bg-gray-100 rounded-full px-3 font-semibold text-gray-600">
                        #travel
                    </span>
                    <span className="bg-gray-100 rounded-full px-3 font-semibold text-gray-600">
                        #winter
                    </span>
                    <span className="bg-gray-100 rounded-full px-3 font-semibold text-gray-600">
                        #chill
                    </span>
                </div>
            </div>
            <h1 className="m-2 col-start-3 col-end-8 col-span-6">
                Hello World!
            </h1>
            <div className="col-start-3 col-end-8 col-span-6 grid grid-cols-8">
                <div className="col-span-1">
                    <Image
                        src="/assets/port27351.png"
                        width={1168 / 4}
                        height={1063 / 4}
                        alt="your humble author"
                        className="rounded-xl m-1"
                    />
                </div>
                <div className="col-span-7 flex items-center">
                    <div className="m-2 text-sm">
                        <div className="prose-h4 font-semibold">
                            By Archie Cowan
                        </div>
                        <div>
                            Archie Cowan loves shipping software. He wants to
                            help you do the same.
                        </div>
                    </div>
                </div>
            </div>
            <div className="m-2 col-start-3 col-end-8 col-span-6">
                <div className="rounded-xl shadow-2xl">
                    <Image
                        src="/assets/astronaut.jpg"
                        width={1024}
                        height={1024}
                        alt="a sailing ship"
                        className="rounded-xl"
                    />
                </div>
                <div className="m-4 col-span-4 text-sm text-center">
                    bh non iaculis aliquam, orci orci sollicitudin ipsum,
                    hendrerit
                </div>
            </div>

            <h2 className="m-2 col-start-3 col-end-8 col-span-6">
                Second level heading
            </h2>
            <h3 className="m-2 col-start-3 col-end-8 col-span-6">
                Third level heading
            </h3>
            <h4 className="m-2 col-start-3 col-end-8 col-span-6">
                Fourth level heading <code>some code</code>
            </h4>
            {paragraphs.map((paragraph, index) => (
                <p
                    key={index}
                    className={
                        index === 4
                            ? "m-2 col-start-3 col-end-8 col-span-6 md:col-start-9 md:col-end-12 md:col-span-3 row-span-12 text-sm"
                            : "m-2 col-start-3 col-end-8 col-span-6"
                    }
                >
                    {index}&nbsp;
                    {paragraph}
                </p>
            ))}
            <div className="grid grid-rows-subgrid col-span-12 col-start-1 col-end-13 md:col-span-8 md:col-start-2 md:col-end-9 place-content-center">
                <div className=" m-5 text-lg">
                    Cras vestibulum bibendum augue. Praesent egestas leo in
                    pede. Praesent blandit odio eu enim. Pellentesque sed dui ut
                    augue blandit sodales. Vestibulum ante ipsum primis in
                    faucibus orci luctus et ultrices
                </div>
            </div>
            <div className="m-2 col-start-1 col-end-13 col-span-12 md:col-start-9 md:col-end-12 md:col-span-3 md:row-span-12 text-2xl">
                Read this big text. It must be important.
            </div>
            <div className="m-2 col-start-3 col-end-8 cols-pan-6">
                <div className="rounded-xl shadow-2xl">
                    <Image
                        src="/assets/ship.jpg"
                        width={1024}
                        height={1024}
                        alt="a sailing ship"
                        className="rounded-xl"
                    />
                </div>
                <div className="m-4 col-span-4 text-sm text-center">
                    bh non iaculis aliquam, orci orci sollicitudin ipsum,
                    hendrerit
                </div>
            </div>

            {paragraphs.slice(2, 5).map((paragraph, index) => (
                <p key={index} className="m-2 col-start-3 col-end-8 col-span-6">
                    2.{index}&nbsp;
                    {paragraph}
                </p>
            ))}
            <div className="col-start-3 col-end-8 col-span-6 m-2 ">
                <figure>
                    <pre className="">
                        {`
export default function HelloPage(): ReactNode {

}
                    `}
                    </pre>
                    <figcaption className="text-center">
                        An example code element.
                    </figcaption>
                </figure>
            </div>
            {paragraphs.slice(3, 7).map((paragraph, index) => (
                <p key={index} className="m-2 col-start-3 col-end-8 col-span-6">
                    2.{index}&nbsp;
                    {paragraph}
                </p>
            ))}
            <blockquote className="col-start-3 col-end-8 col-span-6 m-2">
                {/*
                https://blog.hubspot.com/sales/famous-quotes
                */}
                {`Your time is limited, so don't waste it living someone else's
                life. Don't be trapped by dogma – which is living with the
                results of other people's thinking. -Steve Jobs
                `}
            </blockquote>
            <div className="col-start-1 col-end-13 col-span-12">
                <div className="col-start-1 col-end-13 col-span-12 ">
                    <figure>
                        <Image
                            src="/assets/boschfaces.jpg"
                            alt={
                                "faces being eaten by flowers, stable diffusion"
                            }
                            width={1344}
                            height={768}
                            className="col-start-1 col-end-13 col-span-12 w-full"
                        />
                        <figcaption className="text-center">
                            bh non iaculis aliquam, orci orci sollicitudin
                            ipsum, hendrerit
                        </figcaption>
                    </figure>
                </div>
            </div>
            {paragraphs.slice(3, 7).map((paragraph, index) => (
                <p key={index} className="m-2 col-start-3 col-end-8 col-span-6">
                    2.{index}&nbsp;
                    {paragraph}
                </p>
            ))}

            <p className="m-2 col-start-3 col-end-8 col-span-6 text-sm">
                Quotes as footnotes:
            </p>
            <ul className="m-2 col-start-3 col-end-8 col-span-6 text-sm">
                <li>
                    If you look at what you have in life, you&rsquo;ll always
                    have more. If you look at what you don&rsquo;t have in life,
                    you&rsquo;ll never have enough. -Oprah Winfrey
                </li>
                <li>
                    If you set your goals ridiculously high and it&rsquo;s a
                    failure, you will fail above everyone else&rsquo;s success.
                    -James Cameron
                </li>
                <li>
                    {`
                    You may say I'm a dreamer, but I'm not the only one. I hope
                    someday you'll join us. And the world will live as
                    one. -John Lennon
                `}
                </li>
            </ul>
        </div>
    );
}
